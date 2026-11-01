const Message = require("../models/Message");
const Chat = require("../models/Chat");
const User = require("../models/User");
const { sendPushToUser } = require("../utils/pushService");
const { deleteFromCloudinary } = require("../utils/cloudinary");
const {
  isParticipant, visibleTo, populateMessage, serializeMessage,
  emitToParticipants, syncChatSummaries, validId,
} = require("../utils/messageUtils");

const MAX_CONTENT_LENGTH = 5000;
const fail = (res, status, message) => res.status(status).json({ success: false, message });
const clientIdFor = (value) => {
  if (value == null) return undefined;
  if (typeof value !== "string" || !/^[a-zA-Z0-9_-]{8,100}$/.test(value)) throw new Error("Invalid client message ID");
  return value;
};
const existingSend = async (chatId, sender, clientId) => clientId ? Message.findOne({ chat: chatId, sender, clientId }) : null;
const logError = (operation, error) => console.error(`${operation}:`, error.message);

const authorizedChat = async (req, res, chatId) => {
  if (!validId(chatId)) { fail(res, 400, "Invalid chat ID"); return null; }
  const chat = await Chat.findById(chatId);
  if (!chat) { fail(res, 404, "Chat not found"); return null; }
  if (!isParticipant(chat, req.user._id)) { fail(res, 403, "You are not a participant in this chat"); return null; }
  return chat;
};

const checkBlockStatus = async (senderId, recipientId) => {
  const [sender, recipient] = await Promise.all([
    User.findById(senderId).select("blockedUsers"),
    User.findById(recipientId).select("blockedUsers"),
  ]);
  if (!sender || !recipient) return "User not found";
  if (sender.hasBlocked(recipientId)) return "You have blocked this user. Unblock to send messages.";
  if (recipient.hasBlocked(senderId)) return "You cannot send messages to this user.";
  return null;
};

const getReply = async (replyTo, chat, userId) => {
  if (!replyTo) return null;
  if (!validId(replyTo)) throw new Error("Invalid reply ID");
  const reply = await Message.findOne({
    _id: replyTo, chat: chat._id, ...visibleTo(userId, chat),
  }).select("_id");
  if (!reply) throw new Error("The message you replied to is unavailable");
  return reply._id;
};

const getMessages = async (req, res) => {
  try {
    const chat = await authorizedChat(req, res, req.params.chatId);
    if (!chat) return;
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 50);
    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100) {
      return fail(res, 400, "Page must be positive and limit must be between 1 and 100");
    }
    const visibility = visibleTo(req.user._id, chat);
    if (req.query.before) {
      if (!validId(req.query.before)) return fail(res, 400, "Invalid history cursor");
      const cursor = await Message.findOne({ _id: req.query.before, chat: chat._id }).select("createdAt");
      if (!cursor) return fail(res, 400, "History cursor is unavailable");
      visibility.$or = [{ createdAt: { $lt: cursor.createdAt } }, { createdAt: cursor.createdAt, _id: { $lt: cursor._id } }];
    }
    const messages = await populateMessage(Message.find({
      chat: chat._id, ...visibility,
    })).sort({ createdAt: -1, _id: -1 }).limit(limit + 1).skip((page - 1) * limit).lean();
    const hasMore = messages.length > limit;
    const ordered = messages.slice(0, limit).reverse().map((message) => serializeMessage(message, req.user._id));
    return res.json({ success: true, count: ordered.length, messages: ordered, hasMore, page });
  } catch (error) {
    logError("Get messages failed", error);
    return fail(res, 500, "Server error while fetching messages");
  }
};

const deliverMessage = async (req, chat, message, content) => {
  const userId = req.user._id.toString();
  const recipientId = chat.participants.find((id) => id.toString() !== userId)?.toString();
  await Chat.updateOne({ _id: chat._id }, {
    $set: { lastMessage: message._id },
  });
  const io = req.app.get("io");
  emitToParticipants(io, chat, "new_message", { chatId: chat._id.toString(), message });
  await syncChatSummaries(io, chat);
  if (recipientId) {
    io?.to(recipientId).emit("message_notification", { chatId: chat._id.toString(), message });
    const recipient = await User.findById(recipientId).select("mutedChats");
    if (!recipient?.mutedChats.some((id) => id.equals(chat._id))) {
      void sendPushToUser(recipientId, {
        title: req.user.fullName, body: content.slice(0, 100),
        tag: `chat-${chat._id}`, data: { type: "message", chatId: chat._id.toString(), url: `/chat/${chat._id}` },
      });
    }
  }
};

const sendMessage = async (req, res) => {
  try {
    const { chatId, content, replyTo } = req.body;
    if (typeof content !== "string" || !content.trim() || content.trim().length > MAX_CONTENT_LENGTH) {
      return fail(res, 400, `Message content must be between 1 and ${MAX_CONTENT_LENGTH} characters`);
    }
    const clientId = clientIdFor(req.body.clientId);
    const chat = await authorizedChat(req, res, chatId);
    if (!chat) return;
    const existing = await existingSend(chat._id, req.user._id, clientId);
    if (existing) return res.json({ success: true, data: serializeMessage(await populateMessage(Message.findById(existing._id)).lean(), req.user._id), replayed: true });
    const recipientId = chat.participants.find((id) => !id.equals(req.user._id));
    if (recipientId) {
      const blocked = await checkBlockStatus(req.user._id, recipientId);
      if (blocked) return fail(res, 403, blocked);
    }
    let reply;
    try { reply = await getReply(replyTo, chat, req.user._id); }
    catch (error) { return fail(res, 400, error.message); }
    const created = await Message.create({
      chat: chat._id, sender: req.user._id, content: content.trim(), replyTo: reply, clientId,
    });
    const message = serializeMessage(await populateMessage(Message.findById(created._id)).lean(), req.user._id);
    await deliverMessage(req, chat, message, message.content);
    return res.status(201).json({ success: true, message: "Message sent", data: message });
  } catch (error) {
    if (error.code === 11000) {
      const existing = await existingSend(req.body.chatId, req.user._id, req.body.clientId);
      if (existing) return res.json({ success: true, data: serializeMessage(await populateMessage(Message.findById(existing._id)).lean(), req.user._id), replayed: true });
    }
    logError("Send message failed", error);
    return fail(res, 500, "Server error while sending message");
  }
};

const sendMediaMessage = async (req, res) => {
  try {
    const { chatId, replyTo } = req.body;
    if (!req.file) return fail(res, 400, "No media file uploaded");
    let clientId;
    try { clientId = clientIdFor(req.body.clientId); } catch (error) { await deleteFromCloudinary(req.file.filename, req.file.mimetype.startsWith("video/") ? "video" : "image"); return fail(res, 400, error.message); }
    const chat = await authorizedChat(req, res, chatId);
    if (!chat) return;
    const existing = await existingSend(chat._id, req.user._id, clientId);
    if (existing) {
      await deleteFromCloudinary(req.file.filename, req.file.mimetype.startsWith("video/") ? "video" : "image");
      return res.json({ success: true, data: serializeMessage(await populateMessage(Message.findById(existing._id)).lean(), req.user._id), replayed: true });
    }
    const recipientId = chat.participants.find((id) => !id.equals(req.user._id));
    if (recipientId) {
      const blocked = await checkBlockStatus(req.user._id, recipientId);
      if (blocked) return fail(res, 403, blocked);
    }
    const reply = await getReply(replyTo, chat, req.user._id);
    const messageType = req.file.mimetype.startsWith("video/") ? "video" : "image";
    const created = await Message.create({
      chat: chat._id, sender: req.user._id, messageType, replyTo: reply, clientId,
      media: {
        url: req.file.path, publicId: req.file.filename, type: messageType,
        size: req.file.size || 0,
        width: req.file.width || 0, height: req.file.height || 0,
        thumbnail: messageType === "video" ? req.file.path.replace(/\.[^/.]+$/, ".jpg") : "",
      },
      mediaAutoDeleteAt: new Date(Date.now() + 2 * 60 * 1000),
    });
    const message = serializeMessage(await populateMessage(Message.findById(created._id)).lean(), req.user._id);
    await deliverMessage(req, chat, message, messageType === "video" ? "Sent a video" : "Sent a photo");
    return res.status(201).json({ success: true, message: "Media sent", data: message });
  } catch (error) {
    if (req.file?.filename) await deleteFromCloudinary(req.file.filename, req.file.mimetype.startsWith("video/") ? "video" : "image");
    if (error.code === 11000) {
      const existing = await existingSend(req.body.chatId, req.user._id, req.body.clientId);
      if (existing) return res.json({ success: true, data: serializeMessage(await populateMessage(Message.findById(existing._id)).lean(), req.user._id), replayed: true });
    }
    if (["Invalid client message ID", "Invalid reply ID", "The message you replied to is unavailable"].includes(error.message)) return fail(res, 400, error.message);
    logError("Send media failed", error);
    return fail(res, ["Invalid reply ID", "The message you replied to is unavailable"].includes(error.message) ? 400 : 500,
      error.message.startsWith("The message") || error.message === "Invalid reply ID" ? error.message : "Server error while sending media");
  }
};

const editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;
    if (!validId(messageId)) return fail(res, 400, "Invalid message ID");
    if (typeof content !== "string" || !content.trim() || content.trim().length > MAX_CONTENT_LENGTH) {
      return fail(res, 400, `Message content must be between 1 and ${MAX_CONTENT_LENGTH} characters`);
    }
    const message = await Message.findById(messageId);
    if (!message || message.deletedForEveryone) return fail(res, 404, "Message not found");
    const chat = await authorizedChat(req, res, message.chat);
    if (!chat) return;
    if (!message.sender.equals(req.user._id)) return fail(res, 403, "You can only edit your own messages");
    if (message.messageType !== "text") return fail(res, 400, "Only text messages can be edited");
    if (message.deletedFor.some((id) => id.equals(req.user._id))) return fail(res, 404, "Message not found");
    if (!message.edited) message.originalContent = message.content;
    message.content = content.trim();
    message.edited = true;
    message.editedAt = new Date();
    await message.save();
    const updated = serializeMessage(await populateMessage(Message.findById(messageId)).lean(), req.user._id);
    emitToParticipants(req.app.get("io"), chat, "message_edited", {
      chatId: chat._id.toString(), messageId, message: updated,
    });
    await syncChatSummaries(req.app.get("io"), chat);
    return res.json({ success: true, message: "Message edited", data: updated });
  } catch (error) {
    logError("Edit message failed", error);
    return fail(res, 500, "Server error while editing message");
  }
};

const markSeen = async (req, res) => {
  try {
    const chat = await authorizedChat(req, res, req.params.chatId);
    if (!chat) return;
    const now = new Date();
    const result = await Message.updateMany({
      chat: chat._id, ...visibleTo(req.user._id, chat), sender: { $ne: req.user._id }, status: { $ne: "seen" },
    }, { $set: { status: "seen", seenAt: now } });
    await Promise.all([
      Chat.updateOne({ _id: chat._id }, { $set: { [`unreadCount.${req.user._id}`]: 0 } }, { timestamps: false }),
      User.updateOne({ _id: req.user._id }, { $pull: { markedUnreadChats: chat._id } }),
    ]);
    emitToParticipants(req.app.get("io"), chat, "messages_seen", {
      chatId: chat._id.toString(), seenBy: req.user._id.toString(), seenAt: now,
    });
    await syncChatSummaries(req.app.get("io"), chat);
    return res.json({ success: true, message: "Messages marked as seen", count: result.modifiedCount });
  } catch (error) {
    logError("Mark seen failed", error);
    return fail(res, 500, "Server error while marking messages as seen");
  }
};

const removeMedia = async (messages) => {
  await Promise.all(messages.filter((message) => message.media?.publicId).map((message) =>
    deleteFromCloudinary(message.media.publicId, message.messageType)));
};

const deleteForMe = async (req, res) => {
  try {
    const { messageId } = req.params;
    if (!validId(messageId)) return fail(res, 400, "Invalid message ID");
    const message = await Message.findById(messageId);
    if (!message) return fail(res, 404, "Message not found");
    const chat = await authorizedChat(req, res, message.chat);
    if (!chat) return;
    const updated = await Message.findOneAndUpdate({ _id: messageId }, { $addToSet: { deletedFor: req.user._id } }, { new: true });
    if (!updated) return fail(res, 404, "Message no longer exists");
    if (chat.participants.every((id) => updated.deletedFor.some((deleted) => deleted.equals(id)))) {
      await Message.deleteOne({ _id: messageId });
      await removeMedia([updated]);
    }
    await syncChatSummaries(req.app.get("io"), chat);
    req.app.get("io")?.to(req.user._id.toString()).emit("message_deleted", {
      chatId: chat._id.toString(), messageId, scope: "me",
    });
    return res.json({ success: true, message: "Message deleted for you", messageId, chatId: chat._id });
  } catch (error) {
    logError("Delete for me failed", error);
    return fail(res, 500, "Server error while deleting message");
  }
};

const deleteForEveryone = async (req, res) => {
  try {
    const { messageId } = req.params;
    if (!validId(messageId)) return fail(res, 400, "Invalid message ID");
    const message = await Message.findById(messageId);
    if (!message) return fail(res, 404, "Message not found");
    const chat = await authorizedChat(req, res, message.chat);
    if (!chat) return;
    if (!message.sender.equals(req.user._id)) return fail(res, 403, "You can only delete your own messages for everyone");
    await Message.deleteOne({ _id: messageId, sender: req.user._id });
    await removeMedia([message]);
    await syncChatSummaries(req.app.get("io"), chat);
    emitToParticipants(req.app.get("io"), chat, "message_deleted", {
      chatId: chat._id.toString(), messageId, hardDeleted: true, scope: "everyone",
    });
    return res.json({ success: true, message: "Message permanently deleted", messageId, chatId: chat._id });
  } catch (error) {
    logError("Delete for everyone failed", error);
    return fail(res, 500, "Server error while deleting message");
  }
};

const bulkDelete = async (req, res, everyone) => {
  try {
    const { messageIds } = req.body;
    if (!Array.isArray(messageIds) || !messageIds.length || messageIds.length > 100 || !messageIds.every(validId)) {
      return fail(res, 400, "Provide between 1 and 100 valid message IDs");
    }
    const ids = [...new Set(messageIds)];
    const messages = await Message.find({ _id: { $in: ids } });
    const chats = await Chat.find({ _id: { $in: [...new Set(messages.map((message) => message.chat.toString()))] } });
    const chatMap = new Map(chats.map((chat) => [chat._id.toString(), chat]));
    // Validate the entire batch before changing any message.
    for (const message of messages) {
      if (!isParticipant(chatMap.get(message.chat.toString()), req.user._id)) return fail(res, 403, "Not authorized to delete these messages");
      if (everyone && !message.sender.equals(req.user._id)) return fail(res, 403, "You can only delete your own messages for everyone");
    }
    const deletedIds = messages.map((message) => message._id.toString());
    if (everyone) {
      await Message.deleteMany({ _id: { $in: deletedIds }, sender: req.user._id });
      await removeMedia(messages);
    } else {
      await Message.updateMany({ _id: { $in: deletedIds } }, { $addToSet: { deletedFor: req.user._id } });
      const updated = await Message.find({ _id: { $in: deletedIds } });
      const removable = updated.filter((message) => chatMap.get(message.chat.toString()).participants.every((id) => message.deletedFor.some((deleted) => deleted.equals(id))));
      if (removable.length) {
        await Message.deleteMany({ _id: { $in: removable.map((message) => message._id) } });
        await removeMedia(removable);
      }
    }
    const io = req.app.get("io");
    for (const chat of chats) {
      await syncChatSummaries(io, chat);
      const idsInChat = messages.filter((message) => message.chat.equals(chat._id)).map((message) => message._id.toString());
      const payload = { chatId: chat._id.toString(), messageIds: idsInChat, scope: everyone ? "everyone" : "me", hardDeleted: everyone };
      if (everyone) emitToParticipants(io, chat, "messages_deleted", payload);
      else io?.to(req.user._id.toString()).emit("messages_deleted", payload);
      for (const messageId of idsInChat) {
        const event = { chatId: chat._id.toString(), messageId, ...payload };
        if (everyone) emitToParticipants(io, chat, "message_deleted", event);
        else io?.to(req.user._id.toString()).emit("message_deleted", event);
      }
    }
    return res.json({ success: true, message: `Deleted ${deletedIds.length} message(s)${everyone ? " for everyone" : ""}`, count: deletedIds.length, deletedIds });
  } catch (error) {
    logError("Bulk delete failed", error);
    return fail(res, 500, "Server error while deleting messages");
  }
};

const leaveCleanup = async (req, res) => {
  try {
    const chat = await authorizedChat(req, res, req.params.chatId);
    if (!chat) return;
    const mode = chat.disappearingMessages?.mode;
    if (!mode || mode === "off") return res.json({ success: true, message: "No cleanup needed", count: 0 });
    const filter = { chat: chat._id, sender: { $ne: req.user._id }, status: "seen", ...visibleTo(req.user._id, chat) };
    const ids = await Message.find(filter).distinct("_id");
    if (!ids.length) return res.json({ success: true, message: "No messages to clean up", count: 0 });
    if (mode === "after_2min") {
      const deleteAt = new Date(Date.now() + 2 * 60 * 1000);
      await Message.updateMany({ _id: { $in: ids }, "disappearingFor.user": { $ne: req.user._id } }, {
        $addToSet: { disappearingFor: { user: req.user._id, deleteAt } },
      });
    } else {
      await Message.updateMany({ _id: { $in: ids } }, { $addToSet: { deletedFor: req.user._id } });
      const removable = await Message.find({ _id: { $in: ids }, deletedFor: { $all: chat.participants } });
      if (removable.length) {
        await Message.deleteMany({ _id: { $in: removable.map((message) => message._id) } });
        await removeMedia(removable);
      }
      await syncChatSummaries(req.app.get("io"), chat);
      req.app.get("io")?.to(req.user._id.toString()).emit("messages_deleted", {
        chatId: chat._id.toString(), messageIds: ids.map(String), scope: "me",
      });
    }
    return res.json({ success: true, message: mode === "after_2min" ? "Cleanup scheduled in 2 minutes" : "Seen messages removed", count: ids.length });
  } catch (error) {
    logError("Leave cleanup failed", error);
    return fail(res, 500, "Server error while cleaning up messages");
  }
};

const searchMessages = async (req, res) => {
  try {
    const { q, chatId } = req.query;
    if (typeof q !== "string" || q.trim().length < 2 || q.length > 200) return fail(res, 400, "Search query must be between 2 and 200 characters");
    const chats = await Chat.find({ participants: req.user._id, ...(chatId ? { _id: validId(chatId) ? chatId : null } : {}) });
    if (chatId && !chats.length) return fail(res, 403, "Not authorized");
    const cleared = new Map(chats.map((chat) => [chat._id.toString(), chat.clearedBy.find((entry) => entry.user.equals(req.user._id))?.clearedAt]));
    const messages = await Message.find({
      chat: { $in: chats.map((chat) => chat._id) }, content: { $regex: q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" },
      ...visibleTo(req.user._id),
    }).sort({ createdAt: -1, _id: -1 }).limit(100).lean();
    const visible = messages.filter((message) => !cleared.get(message.chat.toString()) || message.createdAt > cleared.get(message.chat.toString())).slice(0, 50);
    return res.json({ success: true, count: visible.length, messages: visible.map((message) => serializeMessage(message, req.user._id)) });
  } catch (error) {
    logError("Search messages failed", error);
    return fail(res, 500, "Server error while searching messages");
  }
};

module.exports = {
  getMessages, sendMessage, sendMediaMessage, editMessage, markSeen, leaveCleanup,
  deleteForMe, deleteForEveryone,
  bulkDeleteForMe: (req, res) => bulkDelete(req, res, false),
  bulkDeleteForEveryone: (req, res) => bulkDelete(req, res, true),
  searchMessages,
};
