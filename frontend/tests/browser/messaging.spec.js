import { test, expect } from "@playwright/test";

// Run only against an isolated development backend. Each test creates its own real accounts.
let sequence = 0;
async function pair(browser, request, baseURL) {
  const suffix = `${Date.now().toString(36)}${(++sequence).toString(36)}`;
  const accounts = [];
  for (const name of ["alice", "bob"]) {
    const account = { username: `${name}_${suffix}`, password: "Testpass123", fullName: `${name[0].toUpperCase()}${name.slice(1)} Test` };
    const response = await request.post(`${baseURL}/api/auth/register`, { data: { ...account, email: `${account.username}@example.com` } });
    expect(response.status()).toBe(201);
    accounts.push({ ...account, ...(await response.json()) });
  }
  const [a, b] = accounts;
  const headersA = { Authorization: `Bearer ${a.token}` }, headersB = { Authorization: `Bearer ${b.token}` };
  const sent = await request.post(`${baseURL}/api/friends/request`, { headers: headersA, data: { username: b.username } });
  expect(sent.status()).toBe(201);
  const requests = await (await request.get(`${baseURL}/api/friends/requests`, { headers: headersB })).json();
  const accepted = await request.put(`${baseURL}/api/friends/respond`, { headers: headersB, data: { requestId: requests.received[0]._id, action: "accept" } });
  expect(accepted.status()).toBe(200);
  const created = await request.post(`${baseURL}/api/chats/create`, { headers: headersA, data: { friendId: b.user._id } });
  const { chat } = await created.json();
  const contexts = await Promise.all([browser.newContext(), browser.newContext()]);
  const pages = await Promise.all(contexts.map((context) => context.newPage()));
  const errors = [];
  pages.forEach((page) => page.on("pageerror", (error) => { errors.push(error.message); }));
  for (const [index, page] of pages.entries()) {
    const account = accounts[index];
    await page.goto("/auth");
    await page.getByLabel("Email or username").fill(account.username);
    await page.getByLabel("Password", { exact: true }).fill(account.password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL("/");
    await expect(page.locator(".connection-label")).toHaveText("Connected");
    await page.goto(`/chat/${chat._id}`);
    await expect(page.getByLabel("Message", { exact: true })).toBeVisible();
  }
  const sendAPI = async (content, account = a) => {
    const response = await request.post(`${baseURL}/api/messages/send`, { headers: { Authorization: `Bearer ${account.token}` }, data: { chatId: chat._id, content } });
    expect(response.status()).toBe(201);
    return (await response.json()).data;
  };
  return { a, b, chat, pages, contexts, errors, sendAPI, headersA, headersB };
}
const message = (page, text) => page.locator(".message-scroll").getByText(text, { exact: true });
const sendUI = async (page, text) => {
  await page.getByLabel("Message", { exact: true }).fill(text);
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(message(page, text)).toBeVisible();
};
const options = async (page, text) => {
  await message(page, text).locator("..").locator("..").getByRole("button", { name: "Message options" }).click();
};

test("two users send live; delete-for-me is private and delete-for-everyone persists on both sides", async ({ browser, request, baseURL }) => {
  const f = await pair(browser, request, baseURL); const [a, b] = f.pages;
  try {
    await sendUI(a, "Private deletion");
    await expect(message(b, "Private deletion")).toBeVisible();
    await options(b, "Private deletion");
    await b.getByRole("menuitem", { name: "Delete for everyone" }).count().then((count) => expect(count).toBe(0));
    await b.getByRole("menuitem", { name: "Delete for me", exact: true }).click();
    await b.getByRole("button", { name: "Delete for me", exact: true }).click();
    await expect(message(b, "Private deletion")).toHaveCount(0);
    await expect(message(a, "Private deletion")).toBeVisible();
    await b.reload(); await expect(message(a, "Private deletion")).toBeVisible();
    await expect(b.getByLabel("Message", { exact: true })).toBeVisible();
    await expect(message(b, "Private deletion")).toHaveCount(0);
    await options(a, "Private deletion");
    await a.getByRole("menuitem", { name: "Delete for everyone" }).click();
    await a.getByRole("button", { name: "Delete for everyone" }).click();
    await expect(message(a, "Private deletion")).toHaveCount(0);
    await expect(message(b, "Private deletion")).toHaveCount(0);
    await Promise.all(f.pages.map((page) => page.reload()));
    for (const page of f.pages) { await expect(page.getByLabel("Message", { exact: true })).toBeVisible(); await expect(message(page, "Private deletion")).toHaveCount(0); }
    expect(f.errors).toEqual([]);
  } finally { await Promise.all(f.contexts.map((context) => context.close())); }
});

test("bulk actions confirm IDs, enforce sender ownership, and refresh previews", async ({ browser, request, baseURL }) => {
  const f = await pair(browser, request, baseURL); const [a, b] = f.pages;
  try {
    await sendUI(a, "Bulk one"); await sendUI(a, "Bulk two"); await sendUI(b, "Incoming bulk");
    await options(a, "Bulk one"); await a.getByRole("menuitem", { name: "Select", exact: true }).click();
    await expect(a.getByRole("button", { name: "Delete for everyone", exact: true })).toBeEnabled();
    await message(a, "Bulk two").click();
    await message(a, "Incoming bulk").click();
    await expect(a.getByRole("button", { name: "Delete for everyone", exact: true })).toBeDisabled();
    await a.getByRole("button", { name: "Delete for me", exact: true }).click();
    await a.getByRole("dialog").getByRole("button", { name: "Delete for me", exact: true }).click();
    for (const text of ["Bulk one", "Bulk two", "Incoming bulk"]) await expect(message(a, text)).toHaveCount(0);
    await expect(message(b, "Bulk one")).toBeVisible();
    await sendUI(b, "Latest visible");
    await expect(a.locator(".chat-item-main")).toContainText("Latest visible");
    await a.reload(); await expect(a.getByLabel("Message", { exact: true })).toBeVisible();
    await expect(message(a, "Bulk one")).toHaveCount(0); await expect(message(a, "Latest visible")).toBeVisible();
    await sendUI(b, "Recipient own one"); await sendUI(b, "Recipient own two");
    await options(b, "Recipient own one"); await b.getByRole("menuitem", { name: "Select", exact: true }).click();
    await message(b, "Recipient own two").click();
    await b.getByRole("button", { name: "Delete for everyone", exact: true }).click();
    await b.getByRole("dialog").getByRole("button", { name: "Delete for everyone", exact: true }).click();
    await expect(message(b, "Recipient own one")).toHaveCount(0); await expect(message(b, "Recipient own two")).toHaveCount(0);
    expect(f.errors).toEqual([]);
  } finally { await Promise.all(f.contexts.map((context) => context.close())); }
});

test("failed sends remain visible and retry the same durable client ID", async ({ browser, request, baseURL }) => {
  const f = await pair(browser, request, baseURL); const [a, b] = f.pages;
  try {
    let attempts = 0; const clientIds = [];
    await a.route("**/api/messages/send", async (route) => {
      attempts++; clientIds.push(route.request().postDataJSON().clientId);
      if (attempts === 1) await route.abort("failed"); else await route.continue();
    });
    await a.getByLabel("Message", { exact: true }).fill("Retry exactly once");
    await a.getByRole("button", { name: "Send message", exact: true }).click();
    await expect(message(a, "Retry exactly once")).toBeVisible();
    await expect(a.locator(".message-failure")).toContainText("Not sent");
    await expect(message(b, "Retry exactly once")).toHaveCount(0);
    await a.locator(".message-failure").getByRole("button", { name: "Retry" }).click();
    await expect(message(b, "Retry exactly once")).toBeVisible();
    await expect(a.locator(".message-failure")).toHaveCount(0);
    expect(clientIds.length).toBe(2); expect(clientIds[0]).toBe(clientIds[1]);
    const history = await (await request.get(`${baseURL}/api/messages/${f.chat._id}`, { headers: f.headersA })).json();
    expect(history.messages.filter((item) => item.content === "Retry exactly once")).toHaveLength(1);
    expect(f.errors).toEqual([]);
  } finally { await Promise.all(f.contexts.map((context) => context.close())); }
});

test("rapid sends, editing, replies, typing, and a second tab reconcile without duplicates", async ({ browser, request, baseURL }) => {
  const f = await pair(browser, request, baseURL); const [a, b] = f.pages;
  try {
    const tab = await f.contexts[0].newPage(); await tab.goto(`/chat/${f.chat._id}`);
    await expect(tab.getByLabel("Message", { exact: true })).toBeVisible();
    await a.getByLabel("Message", { exact: true }).fill("Rapid one");
    await a.getByLabel("Message", { exact: true }).press("Enter");
    await a.getByLabel("Message", { exact: true }).fill("Rapid two");
    await a.getByLabel("Message", { exact: true }).press("Enter");
    for (const page of [a, b, tab]) { await expect(message(page, "Rapid one")).toHaveCount(1); await expect(message(page, "Rapid two")).toHaveCount(1); }
    await b.getByLabel("Message", { exact: true }).fill("Typing draft");
    await expect(a.locator(".conversation-header")).toContainText("Typing…");
    await b.getByLabel("Message", { exact: true }).fill("");
    await expect(a.locator(".conversation-header")).not.toContainText("Typing…");
    await options(a, "Rapid one"); await a.getByRole("menuitem", { name: "Edit", exact: true }).click();
    await a.getByLabel("Message text").fill("Edited once"); await a.getByRole("button", { name: "Save changes" }).click();
    for (const page of [a, b, tab]) await expect(message(page, "Edited once")).toHaveCount(1);
    await options(b, "Edited once"); await b.getByRole("menuitem", { name: "Reply", exact: true }).click();
    await sendUI(b, "Reply to edit");
    await expect(a.locator(".quoted-message").filter({ hasText: "Edited once" })).toBeVisible();
    expect(f.errors).toEqual([]);
  } finally { await Promise.all(f.contexts.map((context) => context.close())); }
});

test("older history preserves scroll position and reconnect restores missed messages", async ({ browser, request, baseURL }) => {
  const f = await pair(browser, request, baseURL); const [a, b] = f.pages;
  try {
    for (let index = 0; index < 55; index++) await f.sendAPI(`History item ${index}`);
    await a.reload(); await expect(message(a, "History item 54")).toBeVisible();
    await a.getByRole("button", { name: "Load earlier messages" }).click();
    await expect(message(a, "History item 0")).toBeAttached();
    const before = await a.locator(".message-scroll").evaluate((element) => element.scrollTop);
    expect(before).toBeGreaterThan(100);
    await f.sendAPI("New while reading history", f.b);
    await expect(message(a, "New while reading history")).toBeAttached();
    expect(await a.locator(".message-scroll").evaluate((element) => element.scrollTop)).toBeGreaterThanOrEqual(before - 5);
    await expect(a.getByRole("button", { name: "Jump to latest messages" })).toBeVisible();
    await b.context().setOffline(true);
    await f.sendAPI("Missed while offline");
    await b.context().setOffline(false);
    await expect(message(b, "Missed while offline")).toBeVisible();
    await expect(b.locator(".connection-label")).toHaveText("Connected");
    expect(f.errors).toEqual([]);
  } finally { await Promise.all(f.contexts.map((context) => context.close())); }
});

test("all target widths fit; mobile back, nested dialogs, and chat locks work", async ({ browser, request, baseURL }) => {
  const f = await pair(browser, request, baseURL); const [a] = f.pages;
  try {
    for (const width of [320, 375, 390, 430, 768, 1024, 1440]) {
      await a.setViewportSize({ width, height: 844 });
      await expect(a.getByLabel("Message", { exact: true })).toBeVisible();
      expect(await a.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const box = await a.locator(".composer").boundingBox(); expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(width + 1);
    }
    await a.setViewportSize({ width: 390, height: 844 });
    await a.getByRole("button", { name: "Back to chats" }).click(); await expect(a).toHaveURL("/");
    await a.locator(".chat-item-main").first().click();
    await a.getByRole("button", { name: "Conversation options" }).click();
    await a.getByRole("menuitem", { name: "Clear my history" }).click();
    await expect(a.getByRole("dialog")).toBeVisible(); await a.goBack(); await expect(a.getByRole("dialog")).toHaveCount(0);
    await expect(a).toHaveURL(`/chat/${f.chat._id}`);
    await a.getByRole("button", { name: "Back to chats" }).click();
    await a.locator(".chat-options").click(); await a.getByRole("button", { name: "Lock chat", exact: true }).click();
    await a.getByLabel("Chat lock PIN").fill("123456"); await a.getByRole("button", { name: "Continue", exact: true }).click();
    await a.getByLabel("Confirm PIN", { exact: true }).fill("123456"); await a.getByRole("button", { name: "Confirm", exact: true }).click();
    await a.getByRole("button", { name: "Got it" }).click();
    await expect(a.locator(".chat-item-main")).toHaveCount(0);
    await a.getByRole("button", { name: "Locked chats (1)" }).click(); await a.getByLabel("Chat lock PIN").fill("123456"); await a.getByRole("button", { name: "Confirm", exact: true }).click();
    await expect(a.locator(".chat-item-main")).toHaveCount(1);
    await a.getByRole("button", { name: "Settings", exact: true }).click();
    await a.getByRole("switch", { name: "Device privacy lock" }).click();
    await expect(a.getByRole("dialog")).toHaveCount(2);
    expect(await a.evaluate(() => document.body.style.overflow)).toBe("hidden");
    await a.goBack(); await expect(a.getByRole("dialog")).toHaveCount(1);
    expect(await a.evaluate(() => document.body.style.overflow)).toBe("hidden");
    await a.getByRole("switch", { name: "Device privacy lock" }).click();
    await a.getByLabel("New device password").fill("Device123");
    await a.getByRole("button", { name: "Enable lock" }).click();
    await expect(a.getByRole("dialog")).toHaveCount(1);
    await a.getByRole("button", { name: "Close dialog" }).click();
    await expect(a.getByRole("dialog")).toHaveCount(0);
    expect(await a.evaluate(() => document.body.style.overflow)).not.toBe("hidden");
    await a.reload();
    await a.getByLabel("Device password", { exact: true }).fill("Device123");
    await a.getByRole("button", { name: "Unlock", exact: true }).click();
    await expect(a.getByRole("button", { name: "Settings", exact: true })).toBeVisible();
    await expect(a).toHaveURL("/");
    expect(await a.evaluate(() => history.state?.talishOverlay)).toBeFalsy();
    expect(f.errors).toEqual([]);
  } finally { await Promise.all(f.contexts.map((context) => context.close())); }
});


test("failed media survives chat switching and retries the same file and client ID", async ({ browser, request, baseURL }) => {
  const f = await pair(browser, request, baseURL); const [a] = f.pages;
  try {
    const clientIds = [];
    await a.route("**/api/messages/send-media", async (route) => {
      const multipart = route.request().postDataBuffer().toString();
      clientIds.push(multipart.split('name="clientId"\r\n\r\n')[1].split("\r\n")[0]);
      expect(multipart).toContain('filename="pixel.png"');
      if (clientIds.length === 1) await route.abort("failed");
      else await route.continue();
    });
    await a.setViewportSize({ width: 390, height: 844 });
    await a.locator('input[accept="image/jpeg,image/png,image/webp,image/gif"]').setInputFiles({ name: "pixel.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6S7sAAAAASUVORK5CYII=", "base64") });
    await a.getByRole("button", { name: "Send media", exact: true }).click();
    await expect(a.locator(".message-failure")).toContainText("Not sent");
    await a.getByRole("button", { name: "Back to chats" }).click();
    await a.locator(".chat-item-main").click();
    await expect(a.locator(".message-failure")).toContainText("Not sent");
    await a.locator(".message-failure").getByRole("button", { name: "Retry" }).click();
    await expect(a.locator(".message-failure")).toContainText("Not sent");
    expect(clientIds).toHaveLength(2); expect(clientIds[0]).toBe(clientIds[1]);
    await a.locator(".message-failure").getByRole("button", { name: "Discard" }).click();
    await expect(a.locator(".message-failure")).toHaveCount(0);
    expect(f.errors).toEqual([]);
  } finally { await Promise.all(f.contexts.map((context) => context.close())); }
});
