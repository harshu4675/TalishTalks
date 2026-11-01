const mongoose = require("mongoose");
const Chat = require("../models/Chat");
const Message = require("../models/Message");

const isParticipant = (chat, userId) =>
  chat?.participants.some((id) => id.toString() === userId.toString());

const visibleTo = (userId, chat = null) => {
  const query = {
    deletedForEveryone: false,
    deletedFor: { $ne: userId },
  };
  const clearedAt = chat?.clearedBy?.find(
    (entry) => entry.user.toString() === userId.toString(),
  )?.clearedAt;
  if (clearedAt) query.createdAt = { $gt: clearedAt };
  return query;
};

const messageFields = "-originalContent -deletedFor -media.publicId";
const populateMessage = (query) =>
  query
    .select(messageFields)
    .populate("sender", "fullName username avatar")
    .populate({
      path: "replyTo",
      select: "content sender messageType media.url media.type deletedFor deletedForEveryone",
      populate: { path: "sender", select: "fullName username" },
    });

const serializeMessage = (message, userId) => {
  const value = message.toObject ? message.toObject() : message;
  delete value.deletedFor;
  delete value.originalContent;
  if (value.media) delete value.media.publicId;
  if (value.replyTo) {
    const reply = value.replyTo;
    if (
      reply.deletedForEveryone ||
      reply.deletedFor?.some((id) => id.toString() === userId.toString())
    ) {
      value.replyTo = { _id: reply._id, content: "Message unavailable", messageType: "text" };
    } else {
      delete reply.deletedFor;
      delete reply.deletedForEveryone;
      if (reply.media) delete reply.media.publicId;
    }
  }
  return value;
};

// Personal rooms reach every authorized tab, even when no conversation room is open.
const emitToParticipants = (io, chat, event, payload) => {
  if (!io || !chat) return;
  for (const participant of chat.participants) {
    const userId = participant._id || participant;
    io.to(userId.toString()).emit(event, payload);
  }
};

const previewFor = async (chat, userId) => {
  const message = await Message.findOne({
    chat: chat._id,
    ...visibleTo(userId, chat),
  })
    .sort({ createdAt: -1, _id: -1 })
    .select("content sender status createdAt messageType edited deletedForEveryone")
    .lean();
  return message || null;
};

const summarizeChat = async (io, chatOrId) => {
  const chat = await Chat.findById(chatOrId?._id || chatOrId);
  if (!chat) return;
  const last = await Message.findOne({
    chat: chat._id,
    deletedForEveryone: false,
  }).sort({ createdAt: -1, _id: -1 }).select("_id");
  if (chat.lastMessage?.toString() !== last?._id.toString()) {
    await Chat.updateOne({ _id: chat._id }, { $set: { lastMessage: last?._id || null } }, { timestamps: false });
  }
  for (const participant of chat.participants) {
    const userId = participant.toString();
    const filter = { chat: chat._id, ...visibleTo(userId, chat) };
    const [lastMessage, unreadCount] = await Promise.all([
      previewFor(chat, userId),
      Message.countDocuments({ ...filter, sender: { $ne: userId }, status: { $ne: "seen" } }),
    ]);
    await Chat.updateOne(
      { _id: chat._id },
      { $set: { [`unreadCount.${userId}`]: unreadCount } },
      { timestamps: false },
    );
    io?.to(userId).emit("chat_summary", {
      chatId: chat._id.toString(), lastMessage, unreadCount,
    });
  }
};

// Serialize read/write snapshots per chat so an older deletion cannot restore a newer preview.
const summaryQueues = new Map();
const syncChatSummaries = (io, chatOrId) => {
  const chatId = (chatOrId?._id || chatOrId).toString();
  const previous = summaryQueues.get(chatId) || Promise.resolve();
  const task = previous.catch(() => {}).then(() => summarizeChat(io, chatOrId));
  summaryQueues.set(chatId, task);
  task.finally(() => {
    if (summaryQueues.get(chatId) === task) summaryQueues.delete(chatId);
  }).catch(() => {});
  return task;
};

const validId = (id) => (typeof id === "string" || id instanceof mongoose.Types.ObjectId) && mongoose.isValidObjectId(id);

module.exports = {
  isParticipant, visibleTo, populateMessage, serializeMessage,
  emitToParticipants, previewFor, syncChatSummaries, validId,
};
