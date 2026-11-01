const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const { Writable } = require("node:stream");
const { cloudinary } = require("../utils/cloudinary");
const { mkdtemp, rm } = require("node:fs/promises");
const { tmpdir } = require("node:os");
const path = require("node:path");
const net = require("node:net");
const mongoose = require("mongoose");
const { io: connectSocket } = require("socket.io-client");

let mongoProcess, dataDirectory, app, server, io, base, alice, bob, stranger, chat;
const sockets = [];
const User = require("../models/User");
const Message = require("../models/Message");
const Chat = require("../models/Chat");
const { runAutoDelete } = require("../socket/autoDeleteWorker");

const freePort = () => new Promise((resolve, reject) => {
  const probe = net.createServer();
  probe.on("error", reject);
  probe.listen(0, "127.0.0.1", () => {
    const port = probe.address().port;
    probe.close(() => resolve(port));
  });
});
const waitFor = async (predicate, timeout = 10000) => {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error("Timed out waiting for test condition");
};

before(async () => {
  process.env.NODE_ENV = "test";
  process.env.JWT_SECRET = "isolated-integration-test-secret-not-for-deployment";
  process.env.CLIENT_URL = "http://localhost:3000";
  delete process.env.VAPID_PUBLIC_KEY;
  delete process.env.VAPID_PRIVATE_KEY;
  if (process.env.TEST_MONGODB_URI) {
    process.env.MONGODB_URI = process.env.TEST_MONGODB_URI;
    if (!/test/i.test(new URL(process.env.MONGODB_URI).pathname.slice(1))) throw new Error("TEST_MONGODB_URI must name an isolated test database");
  } else if (process.env.TEST_MONGOD_PATH) {
    dataDirectory = await mkdtemp(path.join(tmpdir(), "talish-test-db-"));
    const port = await freePort();
    mongoProcess = spawn(process.env.TEST_MONGOD_PATH, ["--dbpath", dataDirectory, "--bind_ip", "127.0.0.1", "--port", String(port)], { stdio: ["ignore", "pipe", "pipe"] });
    let logs = "";
    mongoProcess.stderr.on("data", (chunk) => { logs += chunk; });
    mongoProcess.stdout.on("data", (chunk) => { logs += chunk; });
    process.env.MONGODB_URI = `mongodb://127.0.0.1:${port}/talish_isolated_test`;
    await waitFor(() => logs.includes("Waiting for connections") || mongoProcess.exitCode !== null, 60000).catch((error) => { throw new Error(`${error.message}\n${logs}`); });
  } else {
    throw new Error("Set TEST_MONGOD_PATH to an isolated mongod binary, or TEST_MONGODB_URI to a disposable database with 'test' in its name. Production databases are never used.");
  }
  await mongoose.connect(process.env.MONGODB_URI);
  // This connection is established only after the explicit test-binary/URI guard above.
  await mongoose.connection.db.dropDatabase();
  await Promise.all([User.init(), Chat.init(), Message.init()]);
  ({ app, server, io } = require("../app")());
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${server.address().port}/api`;
  const makeUser = async (name) => {
    const response = await request("POST", "/auth/register", null, { fullName: name, username: name, email: `${name}@example.com`, password: "Testpass123" });
    assert.equal(response.status, 201, JSON.stringify(response.body));
    return response.body;
  };
  [alice, bob, stranger] = await Promise.all([makeUser("alice_test"), makeUser("bob_test"), makeUser("stranger_test")]);
  await User.updateOne({ _id: alice.user._id }, { $addToSet: { friends: bob.user._id } });
  await User.updateOne({ _id: bob.user._id }, { $addToSet: { friends: alice.user._id } });
  const created = await request("POST", "/chats/create", alice, { friendId: bob.user._id });
  assert.equal(created.status, 200);
  chat = created.body.chat;
});

after(async () => {
  sockets.forEach((socket) => socket.disconnect());
  if (io) await new Promise((resolve) => io.close(resolve));
  if (server?.listening) await new Promise((resolve) => server.close(resolve));
  if (mongoose.connection.readyState === 1) {
    if (/test/i.test(mongoose.connection.name)) await mongoose.connection.db.dropDatabase();
    await mongoose.disconnect();
  }
  if (mongoProcess) {
    const exited = new Promise((resolve) => mongoProcess.once("exit", resolve));
    mongoProcess.kill("SIGTERM");
    await exited;
  }
  if (dataDirectory) await rm(dataDirectory, { recursive: true, force: true });
});

async function request(method, route, account, body, headers = {}) {
  const response = await fetch(base + route, {
    method, headers: { "Content-Type": "application/json", ...(account ? { Authorization: `Bearer ${account.token}` } : {}), ...headers },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  return { status: response.status, body: await response.json() };
}
const send = (content, account = alice, extra = {}) => request("POST", "/messages/send", account, { chatId: chat._id, content, ...extra });
const history = (account = alice, query = "") => request("GET", `/messages/${chat._id}${query}`, account);
const summary = async (account = alice) => (await request("GET", "/chats", account)).body.chats.find((item) => item._id === chat._id);
const socketFor = async (account) => {
  const socket = connectSocket(base.replace("/api", ""), { auth: { token: account.token }, transports: ["websocket"], reconnection: false });
  sockets.push(socket);
  const events = [];
  socket.onAny((event, payload) => events.push({ event, payload }));
  await waitFor(() => socket.connected);
  return { socket, events };
};

test("authentication, friendship and conversation membership are enforced", async () => {
  assert.equal((await request("GET", "/auth/me")).status, 401);
  assert.equal((await history(stranger)).status, 403);
  assert.equal((await send("forbidden", stranger)).status, 403);
  assert.equal((await request("GET", "/messages/not-an-id", alice)).status, 400);
  assert.equal((await history(alice, "?limit=101")).status, 400);
  const me = await request("GET", "/auth/me", alice);
  for (const field of ["password", "chatLockPin", "pushSubscriptions", "socketId"]) assert.equal(field in me.body.user, false);
});

test("send retry is durable/idempotent and both participants receive one message", async () => {
  const recipient = await socketFor(bob);
  const senderTab = await socketFor(alice);
  const clientId = "integration-idempotent-send";
  const [first, duplicate] = await Promise.all([send("Hello Bob", alice, { clientId }), send("Hello Bob", alice, { clientId })]);
  assert.equal(first.body.data._id, duplicate.body.data._id);
  await waitFor(() => recipient.events.filter(({ event, payload }) => event === "new_message" && payload.message.clientId === clientId).length === 1);
  assert(senderTab.events.some(({ event }) => event === "chat_summary"));
  assert.equal((await history(bob)).body.messages.at(-1).content, "Hello Bob");
  assert.equal((await summary(bob)).unreadCount, 1);
});

test("delete for me persists, updates previews/counts, and leaves the other user's history intact", async () => {
  const sent = await send("Private deletion");
  const id = sent.body.data._id;
  const result = await request("DELETE", `/messages/${id}/me`, bob);
  assert.equal(result.status, 200);
  assert.equal((await history(bob)).body.messages.some((message) => message._id === id), false);
  assert.equal((await history(alice)).body.messages.some((message) => message._id === id), true);
  assert.notEqual((await summary(bob)).lastMessage._id, id);
  assert.equal((await summary(alice)).lastMessage._id, id);
  assert.equal((await request("DELETE", `/messages/${id}/me`, bob)).status, 200);
});

test("delete for everyone requires sender ownership, reaches both tabs, and cannot return after refresh", async () => {
  const sent = await send("Remove for both");
  const id = sent.body.data._id;
  const a = await socketFor(alice), b = await socketFor(bob);
  assert.equal((await request("DELETE", `/messages/${id}/everyone`, bob)).status, 403);
  assert.equal((await request("DELETE", `/messages/${id}/everyone`, stranger)).status, 403);
  assert.equal((await request("DELETE", `/messages/${id}/everyone`, alice)).status, 200);
  await waitFor(() => a.events.some(({ event, payload }) => event === "message_deleted" && payload.messageId === id) && b.events.some(({ event, payload }) => event === "message_deleted" && payload.messageId === id));
  for (const account of [alice, bob]) assert.equal((await history(account)).body.messages.some((message) => message._id === id), false);
  assert.notEqual((await summary(alice)).lastMessage?._id, id);
  assert.notEqual((await summary(bob)).lastMessage?._id, id);
});

test("bulk deletion validates the whole batch before writes and rejects duplicates safely", async () => {
  const own = (await send("Bulk own")).body.data;
  const incoming = (await send("Bulk incoming", bob)).body.data;
  const rejected = await request("POST", "/messages/bulk-delete-everyone", alice, { messageIds: [own._id, incoming._id] });
  assert.equal(rejected.status, 403);
  assert.equal((await Message.findById(own._id)).content, "Bulk own");
  const ids = [own._id, own._id];
  const deleted = await request("POST", "/messages/bulk-delete-me", bob, { messageIds: ids });
  assert.equal(deleted.status, 200);
  assert.equal(deleted.body.count, 1);
  assert.equal((await history(bob)).body.messages.some((message) => message._id === own._id), false);
  assert.equal((await history(alice)).body.messages.some((message) => message._id === own._id), true);
  assert.equal((await request("POST", "/messages/bulk-delete-me", bob, { messageIds: ids })).body.count, 1);
  assert.equal((await request("POST", "/messages/bulk-delete-me", alice, { messageIds: Array(101).fill(own._id) })).status, 400);
});

test("pagination is chronological, bounded and deduplicated across page boundaries", async () => {
  for (let i = 0; i < 8; i++) await send(`Page message ${i}`);
  const first = (await history(alice, "?page=1&limit=3")).body;
  const second = (await history(alice, "?page=2&limit=3")).body;
  assert.equal(first.messages.length, 3);
  assert.equal(first.hasMore, true);
  assert(first.messages.every((message, index, all) => !index || all[index - 1].createdAt <= message.createdAt));
  assert(new Date(first.messages[0].createdAt) > new Date(second.messages.at(-1).createdAt));
  assert.equal(new Set([...first.messages, ...second.messages].map((message) => message._id)).size, 6);
});

test("edit and seen updates are authorized and synchronized", async () => {
  const message = (await send("Before edit")).body.data;
  assert.equal((await request("PUT", `/messages/${message._id}/edit`, bob, { content: "Bad edit" })).status, 403);
  const edited = await request("PUT", `/messages/${message._id}/edit`, alice, { content: "After edit" });
  assert.equal(edited.body.data.content, "After edit");
  assert.equal(edited.body.data.edited, true);
  assert.equal("originalContent" in edited.body.data, false);
  assert.equal((await request("PUT", `/messages/${chat._id}/seen`, bob)).status, 200);
  assert.equal((await summary(bob)).unreadCount, 0);
  assert.equal((await history(alice)).body.messages.find((item) => item._id === message._id).status, "seen");
});

test("clear/delete chat is private and new messages remain visible afterwards", async () => {
  const before = (await send("Before personal clear")).body.data;
  const cleared = await request("PUT", `/chats/${chat._id}/clear`, alice);
  assert.equal(cleared.status, 200);
  assert.equal((await history(alice)).body.count, 0);
  assert((await history(bob)).body.messages.some((message) => message._id === before._id));
  assert.ok(await Message.findById(before._id));
  await new Promise((resolve) => setTimeout(resolve, 10));
  const after = (await send("After personal clear", bob)).body.data;
  assert.equal((await history(alice)).body.messages[0]._id, after._id);
  assert.equal((await summary(alice)).unreadCount, 1);
  assert.equal((await request("DELETE", `/chats/${chat._id}`, alice)).status, 200);
  assert.equal((await request("GET", "/chats", alice)).body.chats.some((item) => item._id === chat._id), false);
  assert.ok(await Message.findById(after._id));
  await send("Chat returns after new activity");
  assert((await summary(alice)));
});

test("search escapes regex and cannot leak deleted or cleared messages", async () => {
  await send("literal [search] .*");
  const found = await request("GET", `/messages/search?q=${encodeURIComponent("[search] .*")}`, alice);
  assert.equal(found.status, 200);
  assert(found.body.messages.some((message) => message.content === "literal [search] .*"));
  assert.equal((await request("GET", "/messages/search?q=.*", alice)).body.messages.some((message) => message.content === "Before personal clear"), false);
});

test("expiry survives a worker restart and cookie-auth mutations require an allowed origin", async () => {
  const message = (await send("Expiring media")).body.data;
  await Message.updateOne({ _id: message._id }, { $set: { mediaAutoDeleteAt: new Date(Date.now() - 1000) } });
  await runAutoDelete(io);
  assert.equal(await Message.findById(message._id), null);
  assert.equal((await history(bob)).body.messages.some((item) => item._id === message._id), false);
  const response = await fetch(base + `/messages/${chat._id}/seen`, { method: "PUT", headers: { Cookie: `token=${alice.token}`, Origin: "https://untrusted.example" } });
  assert.equal(response.status, 403);
});


test("concurrent chat creation returns one conversation and deletion preserves activity order", async () => {
  const results = await Promise.all([
    request("POST", "/chats/create", alice, { friendId: bob.user._id }),
    request("POST", "/chats/create", bob, { friendId: alice.user._id }),
  ]);
  assert.deepEqual(results.map((result) => result.body.chat._id), [chat._id, chat._id]);
  assert.equal(await Chat.countDocuments({ participants: { $all: [alice.user._id, bob.user._id] } }), 1);
  const before = await summary(alice);
  const oldMessage = (await history(alice)).body.messages[0];
  await request("DELETE", `/messages/${oldMessage._id}/everyone`, oldMessage.sender._id === alice.user._id ? alice : bob);
  const after = await summary(alice);
  assert.equal(after.lastMessage?._id, before.lastMessage?._id);
});

test("bulk delete for everyone confirms every removed ID and blocks media preupload", async () => {
  const messages = await Promise.all([send("Bulk everyone one"), send("Bulk everyone two")]);
  const ids = messages.map((result) => result.body.data._id);
  const deleted = await request("POST", "/messages/bulk-delete-everyone", alice, { messageIds: ids });
  assert.equal(deleted.status, 200);
  assert.deepEqual(new Set(deleted.body.deletedIds), new Set(ids));
  assert.equal(await Message.countDocuments({ _id: { $in: ids } }), 0);
  await User.updateOne({ _id: bob.user._id }, { $addToSet: { blockedUsers: alice.user._id } });
  const saved = ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"].map((key) => [key, process.env[key]]);
  saved.forEach(([key]) => { process.env[key] = "isolated-test-placeholder"; });
  try {
    const form = new FormData(); form.append("chatId", chat._id); form.append("media", new Blob(["image"], { type: "image/png" }), "pixel.png");
    const upload = await fetch(`${base}/messages/send-media`, { method: "POST", headers: { Authorization: `Bearer ${alice.token}` }, body: form });
    assert.equal(upload.status, 403);
  } finally { saved.forEach(([key, value]) => { if (value === undefined) delete process.env[key]; else process.env[key] = value; }); }
  await User.updateOne({ _id: bob.user._id }, { $pull: { blockedUsers: alice.user._id } });
});

test("push subscription endpoints reject untrusted targets and unauthorized access", async () => {
  assert.equal((await request("POST", "/push/subscribe", null, {})).status, 401);
  assert.equal((await request("POST", "/push/subscribe", alice, { subscription: { endpoint: "https://127.0.0.1/internal", keys: {} } })).status, 400);
  assert.equal((await request("POST", "/push/unsubscribe", alice, { endpoint: {} })).status, 400);
});


test("concurrent first chat locks agree on one PIN and keep both requested locks", async () => {
  const account = await request("POST", "/auth/register", null, { fullName: "Lock test", username: "lock_test", email: "lock_test@example.com", password: "Testpass123" });
  await User.updateOne({ _id: account.body.user._id }, { $addToSet: { friends: { $each: [alice.user._id, bob.user._id] } } });
  await User.updateOne({ _id: alice.user._id }, { $addToSet: { friends: account.body.user._id } });
  await User.updateOne({ _id: bob.user._id }, { $addToSet: { friends: account.body.user._id } });
  assert.equal(account.status, 201, JSON.stringify(account.body));
  assert((await User.findById(account.body.user._id)).friends.some((id) => id.equals(bob.user._id)));
  const conversations = await Promise.all([alice, bob].map(async (friend) => { const result = await request("POST", "/chats/create", account.body, { friendId: friend.user._id }); assert.equal(result.status, 200, JSON.stringify(result.body)); return result.body.chat._id; }));
  const results = await Promise.all(conversations.map((id, index) => request("PUT", `/chats/${id}/lock`, account.body, { pin: index ? "654321" : "123456" })));
  assert.deepEqual(results.map((result) => result.status).sort(), [200, 401]);
  const saved = await User.findById(account.body.user._id).select("+chatLockPin lockedChats");
  assert.equal(saved.lockedChats.length, 1);
  const pin = results[0].status === 200 ? "123456" : "654321";
  assert.equal((await request("PUT", `/chats/${conversations[1]}/lock`, account.body, { pin })).status, 200);
  assert.equal((await request("PUT", `/chats/${conversations[1]}/unlock`, account.body, { pin: "000000" })).status, 401);
});

test("media upload checks only its participant, deduplicates retries, and cleans duplicate assets", async () => {
  const originalUpload = cloudinary.uploader.upload_stream, originalDestroy = cloudinary.uploader.destroy;
  const savedEnv = ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"].map((key) => [key, process.env[key]]);
  savedEnv.forEach(([key]) => { process.env[key] = `isolated-${key}`; });
  let sequence = 0;
  const destroyed = [];
  cloudinary.uploader.upload_stream = (_options, callback) => new Writable({
    write(_chunk, _encoding, done) { done(); },
    final(done) {
      const id = `isolated-test-${++sequence}`;
      process.nextTick(() => callback(null, { secure_url: `https://res.cloudinary.com/test/image/upload/${id}.png`, public_id: id, width: 1, height: 1 }));
      done();
    },
  });
  cloudinary.uploader.destroy = async (id) => { destroyed.push(id); return { result: "ok" }; };
  const upload = async () => {
    const form = new FormData();
    form.append("chatId", chat._id); form.append("clientId", "media-retry-isolated");
    form.append("media", new Blob([Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6S7sAAAAASUVORK5CYII=", "base64")], { type: "image/png" }), "pixel.png");
    const response = await fetch(`${base}/messages/send-media`, { method: "POST", headers: { Authorization: `Bearer ${alice.token}` }, body: form });
    return { status: response.status, body: await response.json() };
  };
  try {
    await User.updateMany({ _id: { $in: [bob.user._id, stranger.user._id] } }, { $pull: { blockedUsers: alice.user._id } });
    await User.updateOne({ _id: stranger.user._id }, { $addToSet: { blockedUsers: alice.user._id } });
    const first = await upload(); assert.equal(first.status, 201, JSON.stringify(first.body));
    const replay = await upload(); assert.equal(replay.status, 200);
    assert.equal(first.body.data._id, replay.body.data._id);
    assert.deepEqual(destroyed, ["isolated-test-2"]);
    assert.equal(first.body.data.media.publicId, undefined);
    await User.updateOne({ _id: bob.user._id }, { $addToSet: { blockedUsers: alice.user._id } });
    assert.equal((await upload()).status, 403);
    await request("DELETE", `/messages/${first.body.data._id}/everyone`, alice);
    assert(destroyed.includes("isolated-test-1"));
  } finally {
    cloudinary.uploader.upload_stream = originalUpload; cloudinary.uploader.destroy = originalDestroy;
    savedEnv.forEach(([key, value]) => { if (value === undefined) delete process.env[key]; else process.env[key] = value; });
    await User.updateOne({ _id: stranger.user._id }, { $pull: { blockedUsers: alice.user._id } });
    await User.updateOne({ _id: bob.user._id }, { $pull: { blockedUsers: alice.user._id } });
  }
});

test("avatar database failure removes the new asset and preserves the previous avatar", async () => {
  const originalUpload = cloudinary.uploader.upload_stream, originalDestroy = cloudinary.uploader.destroy, originalSave = User.findOneAndUpdate;
  const destroyed = [];
  await User.updateOne({ _id: alice.user._id }, { avatar: "https://res.cloudinary.com/test/old.png", avatarPublicId: "old-avatar" });
  cloudinary.uploader.upload_stream = (_options, callback) => new Writable({ write(_chunk, _encoding, done) { done(); }, final(done) { process.nextTick(() => callback(null, { secure_url: "https://res.cloudinary.com/test/new.png", public_id: "new-avatar" })); done(); } });
  cloudinary.uploader.destroy = async (id) => { destroyed.push(id); return { result: "ok" }; };
  User.findOneAndUpdate = async () => { throw new Error("Simulated database failure"); };
  try {
    const form = new FormData(); form.append("avatar", new Blob(["image"], { type: "image/png" }), "avatar.png");
    const response = await fetch(`${base}/users/avatar`, { method: "POST", headers: { Authorization: `Bearer ${alice.token}` }, body: form });
    assert.equal(response.status, 500);
    assert.deepEqual(destroyed, ["new-avatar"]);
    assert.equal((await User.findById(alice.user._id)).avatarPublicId, "old-avatar");
  } finally {
    cloudinary.uploader.upload_stream = originalUpload; cloudinary.uploader.destroy = originalDestroy; User.findOneAndUpdate = originalSave;
    await User.updateOne({ _id: alice.user._id }, { avatar: "", avatarPublicId: "" });
  }
});


test("cursor pagination does not skip messages when a newer message is deleted", async () => {
  const ids = [];
  for (let index = 0; index < 4; index++) ids.push((await send(`Cursor ${index}`)).body.data._id);
  const first = await history(alice, "?limit=2");
  assert.deepEqual(first.body.messages.map((message) => message._id), ids.slice(2));
  await request("DELETE", `/messages/${ids[3]}/everyone`, alice);
  const older = await history(alice, `?limit=2&before=${ids[2]}`);
  assert.equal(older.status, 200);
  assert.deepEqual(older.body.messages.map((message) => message._id), ids.slice(0, 2));
  assert.equal((await history(alice, "?before=invalid")).status, 400);
});
