const mongoose = require("mongoose");
const Message = require("../models/Message");
const Chat = require("../models/Chat");
const { deleteFromCloudinary } = require("../utils/cloudinary");
const { emitToParticipants, syncChatSummaries } = require("../utils/messageUtils");

const runAutoDelete = async (io) => {
  if (mongoose.connection.readyState !== 1) return;
  const now = new Date();
  const expiredMedia = await Message.find({ mediaAutoDeleteAt: { $lte: now } }).limit(100);
  const byChat = new Map();
  for (const message of expiredMedia) {
    const deleted = await Message.deleteOne({ _id: message._id, mediaAutoDeleteAt: { $lte: now } });
    if (!deleted.deletedCount) continue;
    if (message.media?.publicId) await deleteFromCloudinary(message.media.publicId, message.messageType);
    const chatId = message.chat.toString();
    if (!byChat.has(chatId)) byChat.set(chatId, []);
    byChat.get(chatId).push(message._id.toString());
  }
  for (const [chatId, messageIds] of byChat) {
    const chat = await Chat.findById(chatId);
    emitToParticipants(io, chat, "messages_deleted", { chatId, messageIds, hardDeleted: true });
    await syncChatSummaries(io, chat);
  }

  const disappearing = await Message.find({ disappearingFor: { $elemMatch: { deleteAt: { $lte: now } } } }).limit(100);
  const affected = new Map();
  for (const message of disappearing) {
    const chat = await Chat.findById(message.chat);
    if (!chat) continue;
    const due = message.disappearingFor.filter((entry) => entry.deleteAt <= now);
    const userIds = due.map((entry) => entry.user);
    await Message.updateOne({ _id: message._id }, {
      $addToSet: { deletedFor: { $each: userIds } },
      $pull: { disappearingFor: { user: { $in: userIds } } },
    });
    const updated = await Message.findById(message._id);
    if (chat.participants.every((id) => updated.deletedFor.some((deleted) => deleted.equals(id)))) {
      await Message.deleteOne({ _id: message._id });
      if (message.media?.publicId) await deleteFromCloudinary(message.media.publicId, message.messageType);
    }
    for (const userId of userIds) {
      const key = `${chat._id}:${userId}`;
      if (!affected.has(key)) affected.set(key, { chat, userId: userId.toString(), messageIds: [] });
      affected.get(key).messageIds.push(message._id.toString());
    }
  }
  const synced = new Set();
  for (const { chat, userId, messageIds } of affected.values()) {
    if (!synced.has(chat._id.toString())) {
      await syncChatSummaries(io, chat);
      synced.add(chat._id.toString());
    }
    io?.to(userId).emit("messages_deleted", { chatId: chat._id.toString(), messageIds, scope: "me" });
  }

  const expired = await Message.find({ autoDeleteAt: { $lte: now }, deletedForEveryone: false }).select("_id chat").limit(100);
  if (expired.length) {
    await Message.updateMany({ _id: { $in: expired.map((message) => message._id) } }, {
      $set: { deletedForEveryone: true, content: "This message disappeared", autoDeleteAt: null },
    });
    for (const chatId of [...new Set(expired.map((message) => message.chat.toString()))]) {
      const chat = await Chat.findById(chatId);
      emitToParticipants(io, chat, "messages_auto_deleted", {
        chatId, messageIds: expired.filter((message) => message.chat.toString() === chatId).map((message) => message._id.toString()),
      });
      await syncChatSummaries(io, chat);
    }
  }
};

const startAutoDeleteWorker = (io) => {
  let running = false;
  let timer;
  const tick = async () => {
    if (running) return;
    running = true;
    try { await runAutoDelete(io); }
    catch (error) { console.error("Auto-delete worker failed:", error.message); }
    finally { running = false; }
  };
  const start = () => {
    if (timer) return;
    timer = setInterval(tick, 3000);
    timer.unref();
    void tick();
  };
  if (mongoose.connection.readyState === 1) start();
  else mongoose.connection.once("connected", start);
  return () => {
    clearInterval(timer);
    mongoose.connection.off("connected", start);
  };
};

module.exports = startAutoDeleteWorker;
module.exports.runAutoDelete = runAutoDelete;
