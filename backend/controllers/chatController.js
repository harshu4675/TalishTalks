const Chat = require("../models/Chat");
const Message = require("../models/Message");
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const rateLimit = require("express-rate-limit");
const asyncHandler = require("../middleware/asyncHandler");
const { previewFor, isParticipant, validId, emitToParticipants, syncChatSummaries } = require("../utils/messageUtils");

const fail = (res, status, message) => res.status(status).json({ success: false, message });
const chatOrder = (a, b) => Number(!!b.isPinned) - Number(!!a.isPinned) || new Date(b.lastMessage?.createdAt || b.updatedAt) - new Date(a.lastMessage?.createdAt || a.updatedAt);

const formatChat = async (chat, user) => {
  const userId = user._id.toString();
  const otherUser = chat.participants.find((participant) => !participant._id.equals(user._id));
  const includes = (ids = []) => ids.some((id) => id.equals(chat._id));
  return {
    _id: chat._id,
    otherUser: otherUser ? { _id: otherUser._id, fullName: otherUser.fullName, username: otherUser.username, avatar: otherUser.avatar, isOnline: otherUser.isOnline, lastSeen: otherUser.lastSeen } : null,
    lastMessage: await previewFor(chat, userId),
    disappearingMessages: chat.disappearingMessages,
    unreadCount: await Message.countDocuments({
      chat: chat._id, deletedForEveryone: false, deletedFor: { $ne: user._id },
      sender: { $ne: user._id }, status: { $ne: "seen" },
      ...(chat.clearedBy.find((entry) => entry.user.equals(user._id)) ? { createdAt: { $gt: chat.clearedBy.find((entry) => entry.user.equals(user._id)).clearedAt } } : {}),
    }),
    updatedAt: chat.updatedAt, createdAt: chat.createdAt,
    isPinned: includes(user.pinnedChats), isMuted: includes(user.mutedChats),
    isMarkedUnread: includes(user.markedUnreadChats), isLocked: includes(user.lockedChats),
    isBlocked: !!otherUser && user.blockedUsers.some((id) => id.equals(otherUser._id)),
    iBlockedThem: !!otherUser && user.blockedUsers.some((id) => id.equals(otherUser._id)),
    theyBlockedMe: !!otherUser?.blockedUsers?.some((id) => id.equals(user._id)),
  };
};

const authorizedChat = async (req, res, chatId = req.params.chatId) => {
  if (!validId(chatId)) { fail(res, 400, "Invalid chat ID"); return null; }
  const chat = await Chat.findById(chatId);
  if (!chat) { fail(res, 404, "Chat not found"); return null; }
  if (!isParticipant(chat, req.user._id)) { fail(res, 403, "Not authorized"); return null; }
  return chat;
};

const getChats = async (req, res) => {
  const [chats, user] = await Promise.all([
    Chat.find({ participants: req.user._id }).populate("participants", "fullName username avatar isOnline lastSeen blockedUsers").sort({ updatedAt: -1 }),
    User.findById(req.user._id).select("blockedUsers pinnedChats mutedChats markedUnreadChats lockedChats"),
  ]);
  const formatted = await Promise.all(chats.map((chat) => formatChat(chat, user)));
  const visible = formatted.filter((chat, index) => {
    const clearedAt = chats[index].clearedBy.find((entry) => entry.user.equals(user._id))?.clearedAt;
    return !clearedAt || (chat.lastMessage && new Date(chat.lastMessage.createdAt) > clearedAt);
  }).sort(chatOrder);
  res.json({ success: true, count: visible.length, chats: visible });
};

// Serialize pair creation within this server process; the existing schema remains unchanged.
const creationLocks = new Map();
const createChat = async (req, res) => {
  const { friendId } = req.body;
  if (!validId(friendId)) return fail(res, 400, "A valid friend ID is required");
  if (friendId === req.user._id.toString()) return fail(res, 400, "You cannot chat with yourself");
  const [currentUser, otherUser] = await Promise.all([User.findById(req.user._id), User.findById(friendId)]);
  if (!otherUser) return fail(res, 404, "User not found");
  if (!currentUser.friends.some((id) => id.equals(friendId))) return fail(res, 403, "You can only chat with friends");
  if (currentUser.blockedUsers.some((id) => id.equals(friendId))) return fail(res, 403, "You have blocked this user. Unblock to chat.");
  if (otherUser.blockedUsers.some((id) => id.equals(currentUser._id))) return fail(res, 403, "You cannot chat with this user.");
  const pair = [currentUser._id.toString(), otherUser._id.toString()].sort();
  const key = pair.join(":");
  while (creationLocks.has(key)) await creationLocks.get(key);
  let release;
  const lock = new Promise((resolve) => { release = resolve; });
  creationLocks.set(key, lock);
  try {
    const filter = { participants: { $all: pair, $size: 2 } };
    const chat = await Chat.findOne(filter) || await Chat.create({ participants: pair });
    await chat.populate("participants", "fullName username avatar isOnline lastSeen blockedUsers");
    res.json({ success: true, chat: await formatChat(chat, currentUser) });
  } finally { creationLocks.delete(key); release(); }
};

// Clearing history is personal. It never deletes the other participant's messages or shared media.
const clearHistory = async (req, res, hideChat) => {
  const chat = await authorizedChat(req, res);
  if (!chat) return;
  const clearedAt = new Date();
  await Chat.updateOne({ _id: chat._id }, { $pull: { clearedBy: { user: req.user._id } } });
  await Chat.updateOne({ _id: chat._id }, {
    $addToSet: { clearedBy: { user: req.user._id, clearedAt } },
    $set: { [`unreadCount.${req.user._id}`]: 0 },
  }, { timestamps: false });
  const flagUpdate = { $pull: { markedUnreadChats: chat._id } };
  if (hideChat) Object.assign(flagUpdate, { $pull: { markedUnreadChats: chat._id, pinnedChats: chat._id, mutedChats: chat._id, lockedChats: chat._id } });
  await User.updateOne({ _id: req.user._id }, flagUpdate);
  const freshChat = await Chat.findById(chat._id);
  await syncChatSummaries(req.app.get("io"), freshChat);
  const payload = { chatId: chat._id.toString(), clearedAt, hidden: hideChat };
  req.app.get("io")?.to(req.user._id.toString()).emit("chat_cleared", payload);
  res.json({ success: true, message: hideChat ? "Chat removed for you" : "Chat history cleared for you", ...payload });
};
const clearChat = (req, res) => clearHistory(req, res, false);
const deleteChat = (req, res) => clearHistory(req, res, true);

const setDisappearing = async (req, res) => {
  const { mode } = req.body;
  if (!["on_seen", "after_2min", "off"].includes(mode)) return fail(res, 400, "Invalid mode");
  const chat = await authorizedChat(req, res);
  if (!chat) return;
  chat.disappearingMessages = { mode, enabled: mode !== "off" };
  await chat.save();
  emitToParticipants(req.app.get("io"), chat, "disappearing_mode_changed", {
    chatId: chat._id.toString(), disappearingMessages: chat.disappearingMessages, changedBy: req.user._id,
  });
  res.json({ success: true, message: mode === "off" ? "Disappearing messages disabled" : mode === "on_seen" ? "Seen messages disappear when you leave the chat" : "Seen messages disappear two minutes after you leave", disappearingMessages: chat.disappearingMessages });
};

const pinLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: process.env.NODE_ENV === "test" ? 1000 : 20,
  keyGenerator: (req) => req.user._id.toString(), standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: "Too many PIN attempts. Try again in 15 minutes." },
});

const lockChat = async (req, res) => {
  const { pin } = req.body;
  if (typeof pin !== "string" || !/^\d{4,12}$/.test(pin)) return fail(res, 400, "Enter a PIN of 4 to 12 digits");
  const chat = await authorizedChat(req, res);
  if (!chat) return;
  const user = await User.findById(req.user._id).select("+chatLockPin");
  if (user.chatLockPin) {
    if (!(await bcrypt.compare(pin, user.chatLockPin))) return fail(res, 401, "Incorrect PIN. Use your existing chat lock PIN.");
    await User.updateOne({ _id: user._id }, { $addToSet: { lockedChats: chat._id } });
  } else {
    const hash = await bcrypt.hash(pin, 10);
    // Compare-and-set prevents simultaneous first locks from choosing different PINs.
    const initialized = await User.findOneAndUpdate({ _id: user._id, chatLockPin: "" }, { $set: { chatLockPin: hash }, $addToSet: { lockedChats: chat._id } });
    if (!initialized) {
      if (!(await bcrypt.compare(pin, user.chatLockPin))) return fail(res, 401, "A chat lock was just created. Use its existing PIN.");
      await User.updateOne({ _id: user._id }, { $addToSet: { lockedChats: chat._id } });
    }
  }
  res.json({ success: true, message: "Chat locked successfully" });
};
const checkPin = async (req, res, remove) => {
  const { pin } = req.body;
  if (typeof pin !== "string" || !/^\d{4,12}$/.test(pin)) return fail(res, 400, "Enter your chat lock PIN");
  const chat = await authorizedChat(req, res);
  if (!chat) return;
  const user = await User.findById(req.user._id).select("+chatLockPin");
  if (!user.chatLockPin || !(await bcrypt.compare(pin, user.chatLockPin))) return fail(res, 401, "Incorrect PIN");
  if (remove) await User.updateOne({ _id: user._id }, { $pull: { lockedChats: chat._id } });
  res.json({ success: true, message: remove ? "Lock removed successfully" : "Chat unlocked" });
};
const unlockChat = (req, res) => checkPin(req, res, false);
const removeLock = (req, res) => checkPin(req, res, true);
const getLockedChats = async (_req, res) => res.json({ success: true, lockedChats: (await User.findById(_req.user._id).select("lockedChats")).lockedChats });

const toggleFlag = (field, flag, label) => async (req, res) => {
  const chat = await authorizedChat(req, res);
  if (!chat) return;
  const user = await User.findById(req.user._id).select(field);
  const enabled = !user[field].some((id) => id.equals(chat._id));
  if (enabled && field === "pinnedChats" && user[field].length >= 3) return fail(res, 400, "You can only pin up to 3 chats. Unpin one first.");
  await User.updateOne({ _id: user._id }, enabled ? { $addToSet: { [field]: chat._id } } : { $pull: { [field]: chat._id } });
  res.json({ success: true, message: `Chat ${enabled ? label[0] : label[1]}`, [flag]: enabled });
};

const handlers = {
  getChats, createChat, clearChat, setDisappearing, lockChat, unlockChat, removeLock, getLockedChats, pinLimiter,
  togglePinChat: toggleFlag("pinnedChats", "isPinned", ["pinned", "unpinned"]),
  toggleMuteChat: toggleFlag("mutedChats", "isMuted", ["muted", "unmuted"]),
  toggleMarkUnread: toggleFlag("markedUnreadChats", "isMarkedUnread", ["marked as unread", "marked as read"]),
  deleteChat,
};
module.exports = Object.fromEntries(Object.entries(handlers).map(([name, handler]) => [name, name === "pinLimiter" ? handler : asyncHandler(handler)]));
