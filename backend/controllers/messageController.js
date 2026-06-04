const Message = require("../models/Message");
const Chat = require("../models/Chat");
const User = require("../models/User");
const { sendPushToUser } = require("../utils/pushService");
const { deleteFromCloudinary } = require("../utils/cloudinary");

// ============================================
// 🔥 NEW: Helper - check if either party blocked the other
// ============================================
const checkBlockStatus = async (senderId, recipientId) => {
  const [sender, recipient] = await Promise.all([
    User.findById(senderId).select("blockedUsers"),
    User.findById(recipientId).select("blockedUsers mutedChats"),
  ]);

  if (!sender || !recipient) return { blocked: true, reason: "User not found" };

  const iBlockedThem = sender.blockedUsers.some(
    (id) => id.toString() === recipientId.toString(),
  );
  if (iBlockedThem) {
    return {
      blocked: true,
      reason: "You have blocked this user. Unblock to send messages.",
    };
  }

  const theyBlockedMe = recipient.blockedUsers.some(
    (id) => id.toString() === senderId.toString(),
  );
  if (theyBlockedMe) {
    return { blocked: true, reason: "You cannot send messages to this user." };
  }

  return { blocked: false, recipient };
};

// ============================================
// @desc    Get messages in a chat
// ============================================
const getMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Chat not found",
      });
    }

    if (!chat.participants.includes(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: "You are not a participant in this chat",
      });
    }

    const clearedEntry = chat.clearedBy.find(
      (c) => c.user.toString() === req.user._id.toString(),
    );
    const clearedAt = clearedEntry ? clearedEntry.clearedAt : null;

    const query = {
      chat: chatId,
      deletedFor: { $ne: req.user._id },
      deletedForEveryone: false,
    };

    if (clearedAt) {
      query.createdAt = { $gt: clearedAt };
    }

    const messages = await Message.find(query)
      .populate("sender", "fullName username avatar")
      .populate({
        path: "replyTo",
        select: "content sender messageType media",
        populate: { path: "sender", select: "fullName username" },
      })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const orderedMessages = messages.reverse();

    return res.status(200).json({
      success: true,
      count: orderedMessages.length,
      messages: orderedMessages,
    });
  } catch (error) {
    console.error("Get messages error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching messages",
    });
  }
};

// ============================================
// @desc    Send a new text message
// ============================================
const sendMessage = async (req, res) => {
  try {
    const { chatId, content, replyTo } = req.body;

    if (!chatId || !content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: "Chat ID and message content are required",
      });
    }

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Chat not found",
      });
    }

    if (!chat.participants.includes(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: "You are not a participant in this chat",
      });
    }

    const otherParticipantId = chat.participants.find(
      (p) => p.toString() !== req.user._id.toString(),
    );

    // 🔥 NEW: Block check
    if (otherParticipantId) {
      const blockStatus = await checkBlockStatus(
        req.user._id,
        otherParticipantId,
      );
      if (blockStatus.blocked) {
        return res.status(403).json({
          success: false,
          message: blockStatus.reason,
        });
      }
    }

    let message = await Message.create({
      chat: chatId,
      sender: req.user._id,
      content: content.trim(),
      status: "sent",
      replyTo: replyTo || null,
    });

    message = await Message.findById(message._id)
      .populate("sender", "fullName username avatar")
      .populate({
        path: "replyTo",
        select: "content sender messageType media",
        populate: { path: "sender", select: "fullName username" },
      });

    if (otherParticipantId) {
      const currentUnread =
        chat.unreadCount?.get(otherParticipantId.toString()) || 0;
      chat.unreadCount.set(otherParticipantId.toString(), currentUnread + 1);
    }
    chat.lastMessage = message._id;
    await chat.save();

    const io = req.app.get("io");
    if (io && otherParticipantId) {
      io.to(otherParticipantId.toString()).emit("new_message", {
        chatId,
        message,
      });

      io.to(otherParticipantId.toString()).emit("message_notification", {
        chatId,
        message,
        sender: {
          _id: req.user._id,
          fullName: req.user.fullName,
          username: req.user.username,
          avatar: req.user.avatar,
        },
      });

      // 🔥 NEW: Respect mute - skip push if recipient muted this chat
      const recipient =
        await User.findById(otherParticipantId).select("mutedChats");
      const isMuted = recipient?.mutedChats?.some(
        (id) => id.toString() === chatId.toString(),
      );

      if (!isMuted) {
        sendPushToUser(otherParticipantId.toString(), {
          title: req.user.fullName,
          body:
            content.trim().length > 100
              ? content.trim().substring(0, 100) + "..."
              : content.trim(),
          tag: `chat-${chatId}`,
          data: {
            type: "message",
            chatId: chatId.toString(),
            url: `/chat/${chatId}`,
          },
        });
      } else {
        console.log(
          `🔇 Push skipped (chat muted) for user ${otherParticipantId}`,
        );
      }
    }

    return res.status(201).json({
      success: true,
      message: "Message sent",
      data: message,
    });
  } catch (error) {
    console.error("Send message error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error while sending message",
    });
  }
};

// ============================================
// @desc    Send a media message (image/video)
// @route   POST /api/messages/send-media
// @access  Private
// ============================================
const sendMediaMessage = async (req, res) => {
  try {
    const { chatId, replyTo } = req.body;

    if (!chatId) {
      return res.status(400).json({
        success: false,
        message: "Chat ID is required",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No media file uploaded",
      });
    }

    const chat = await Chat.findById(chatId);
    if (!chat) {
      const resourceType = req.file.mimetype.startsWith("video/")
        ? "video"
        : "image";
      await deleteFromCloudinary(req.file.filename, resourceType);
      return res.status(404).json({
        success: false,
        message: "Chat not found",
      });
    }

    if (!chat.participants.includes(req.user._id)) {
      const resourceType = req.file.mimetype.startsWith("video/")
        ? "video"
        : "image";
      await deleteFromCloudinary(req.file.filename, resourceType);
      return res.status(403).json({
        success: false,
        message: "Not a participant",
      });
    }

    const otherParticipantId = chat.participants.find(
      (p) => p.toString() !== req.user._id.toString(),
    );

    // 🔥 NEW: Block check (delete uploaded file if blocked)
    if (otherParticipantId) {
      const blockStatus = await checkBlockStatus(
        req.user._id,
        otherParticipantId,
      );
      if (blockStatus.blocked) {
        const resourceType = req.file.mimetype.startsWith("video/")
          ? "video"
          : "image";
        await deleteFromCloudinary(req.file.filename, resourceType);
        return res.status(403).json({
          success: false,
          message: blockStatus.reason,
        });
      }
    }

    const isVideo = req.file.mimetype.startsWith("video/");
    const messageType = isVideo ? "video" : "image";

    // Auto-delete after 2 minutes
    const mediaAutoDeleteAt = new Date(Date.now() + 2 * 60 * 1000);

    let thumbnail = "";
    if (isVideo && req.file.path) {
      thumbnail = req.file.path.replace(/\.[^/.]+$/, ".jpg");
    }

    let message = await Message.create({
      chat: chatId,
      sender: req.user._id,
      content: "",
      messageType,
      media: {
        url: req.file.path,
        publicId: req.file.filename,
        type: messageType,
        width: req.file.width || 0,
        height: req.file.height || 0,
        duration: req.file.duration || 0,
        size: req.file.size || 0,
        thumbnail,
      },
      status: "sent",
      replyTo: replyTo || null,
      mediaAutoDeleteAt,
    });

    message = await Message.findById(message._id)
      .populate("sender", "fullName username avatar")
      .populate({
        path: "replyTo",
        select: "content sender messageType media",
        populate: { path: "sender", select: "fullName username" },
      });

    if (otherParticipantId) {
      const currentUnread =
        chat.unreadCount?.get(otherParticipantId.toString()) || 0;
      chat.unreadCount.set(otherParticipantId.toString(), currentUnread + 1);
    }
    chat.lastMessage = message._id;
    await chat.save();

    // Schedule auto-delete after 2 minutes
    setTimeout(
      async () => {
        try {
          const msg = await Message.findById(message._id);
          if (msg && msg.media?.publicId) {
            await deleteFromCloudinary(msg.media.publicId, messageType);
            await Message.findByIdAndDelete(message._id);

            const io = req.app.get("io");
            if (io) {
              io.to(chatId).emit("message_deleted", {
                chatId,
                messageId: message._id,
                hardDeleted: true,
                mediaExpired: true,
              });
            }
            console.log(
              `🗑️  Auto-deleted media message after 2 min: ${message._id}`,
            );
          }
        } catch (err) {
          console.error("Media auto-delete error:", err.message);
        }
      },
      2 * 60 * 1000,
    );

    const io = req.app.get("io");
    if (io && otherParticipantId) {
      io.to(otherParticipantId.toString()).emit("new_message", {
        chatId,
        message,
      });

      io.to(otherParticipantId.toString()).emit("message_notification", {
        chatId,
        message,
        sender: {
          _id: req.user._id,
          fullName: req.user.fullName,
          username: req.user.username,
          avatar: req.user.avatar,
        },
      });

      // 🔥 NEW: Respect mute
      const recipient =
        await User.findById(otherParticipantId).select("mutedChats");
      const isMuted = recipient?.mutedChats?.some(
        (id) => id.toString() === chatId.toString(),
      );

      if (!isMuted) {
        sendPushToUser(otherParticipantId.toString(), {
          title: req.user.fullName,
          body: isVideo ? "📹 Sent a video" : "📷 Sent a photo",
          tag: `chat-${chatId}`,
          data: {
            type: "message",
            chatId: chatId.toString(),
            url: `/chat/${chatId}`,
          },
        });
      }
    }

    return res.status(201).json({
      success: true,
      message: "Media sent",
      data: message,
    });
  } catch (error) {
    console.error("Send media error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error while sending media",
    });
  }
};

// ============================================
// @desc    Edit a message
// @route   PUT /api/messages/:messageId/edit
// @access  Private
// ============================================
const editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: "Content cannot be empty",
      });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only edit your own messages",
      });
    }

    if (message.messageType !== "text") {
      return res.status(400).json({
        success: false,
        message: "Only text messages can be edited",
      });
    }

    if (!message.edited) {
      message.originalContent = message.content;
    }

    message.content = content.trim();
    message.edited = true;
    message.editedAt = new Date();
    await message.save();

    const updatedMessage = await Message.findById(messageId)
      .populate("sender", "fullName username avatar")
      .populate({
        path: "replyTo",
        select: "content sender messageType media",
        populate: { path: "sender", select: "fullName username" },
      });

    const io = req.app.get("io");
    if (io) {
      io.to(message.chat.toString()).emit("message_edited", {
        chatId: message.chat,
        messageId: message._id,
        message: updatedMessage,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Message edited",
      data: updatedMessage,
    });
  } catch (error) {
    console.error("Edit message error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ============================================
// @desc    Mark messages as seen
// ============================================
const markSeen = async (req, res) => {
  try {
    const { chatId } = req.params;

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Chat not found",
      });
    }

    if (!chat.participants.includes(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    const now = new Date();

    const messagesToUpdate = await Message.find({
      chat: chatId,
      sender: { $ne: req.user._id },
      status: { $ne: "seen" },
      deletedForEveryone: false,
    });

    // 🔥 NEW: Also clear "marked unread" flag when user opens the chat
    const user = await User.findById(req.user._id);
    if (user.markedUnreadChats.some((id) => id.toString() === chatId)) {
      user.markedUnreadChats = user.markedUnreadChats.filter(
        (id) => id.toString() !== chatId,
      );
      await user.save();
    }

    if (messagesToUpdate.length === 0) {
      chat.unreadCount.set(req.user._id.toString(), 0);
      await chat.save();
      return res.status(200).json({
        success: true,
        message: "No new messages to mark",
        count: 0,
      });
    }

    await Message.updateMany(
      { _id: { $in: messagesToUpdate.map((m) => m._id) } },
      {
        $set: {
          status: "seen",
          seenAt: now,
        },
      },
    );

    chat.unreadCount.set(req.user._id.toString(), 0);
    await chat.save();

    if (
      chat.disappearingMessages?.mode &&
      chat.disappearingMessages.mode !== "off"
    ) {
      const messageIds = messagesToUpdate.map((m) => m._id);
      const mode = chat.disappearingMessages.mode;

      let delayMs = 0;

      if (mode === "on_seen") {
        delayMs = 5 * 1000;
      } else if (mode === "after_2min") {
        delayMs = 2 * 60 * 1000;
      }

      if (delayMs > 0) {
        const io = req.app.get("io");

        setTimeout(async () => {
          try {
            const messagesToDelete = await Message.find({
              _id: { $in: messageIds },
            });

            for (const msg of messagesToDelete) {
              if (msg.media?.publicId) {
                await deleteFromCloudinary(msg.media.publicId, msg.messageType);
              }
            }

            const result = await Message.deleteMany({
              _id: { $in: messageIds },
            });

            if (io) {
              messageIds.forEach((msgId) => {
                io.to(chatId).emit("message_deleted", {
                  chatId,
                  messageId: msgId,
                  disappeared: true,
                  hardDeleted: true,
                });
              });
            }

            console.log(
              `🗑️  PERMANENTLY DELETED ${result.deletedCount} disappearing message(s)`,
            );
          } catch (err) {
            console.error("Hard delete error:", err.message);
          }
        }, delayMs);

        console.log(
          `⏱️  Scheduled ${messageIds.length} message(s) for deletion in ${delayMs}ms`,
        );
      }
    }

    const io = req.app.get("io");
    if (io) {
      io.to(chatId).emit("messages_seen", {
        chatId,
        seenBy: req.user._id,
        seenAt: now,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Messages marked as seen",
      count: messagesToUpdate.length,
    });
  } catch (error) {
    console.error("Mark seen error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ============================================
// @desc    Delete for me
// ============================================
const deleteForMe = async (req, res) => {
  try {
    const { messageId } = req.params;
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    if (!message.deletedFor.includes(req.user._id)) {
      message.deletedFor.push(req.user._id);
      await message.save();
    }

    const chat = await Chat.findById(message.chat);
    if (chat) {
      const allParticipantsDeleted = chat.participants.every((p) =>
        message.deletedFor.some((d) => d.toString() === p.toString()),
      );

      if (allParticipantsDeleted) {
        if (message.media?.publicId) {
          await deleteFromCloudinary(
            message.media.publicId,
            message.messageType,
          );
        }

        await Message.findByIdAndDelete(messageId);
        console.log(`🗑️  Both users deleted - removed message from DB`);
      }
    }

    return res.status(200).json({
      success: true,
      message: "Message deleted for you",
    });
  } catch (error) {
    console.error("Delete for me error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ============================================
// @desc    Delete for everyone (HARD DELETE)
// ============================================
const deleteForEveryone = async (req, res) => {
  try {
    const { messageId } = req.params;
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own messages",
      });
    }

    const chatId = message.chat;

    if (message.media?.publicId) {
      await deleteFromCloudinary(message.media.publicId, message.messageType);
    }

    await Message.findByIdAndDelete(messageId);

    const io = req.app.get("io");
    if (io) {
      io.to(chatId.toString()).emit("message_deleted", {
        chatId,
        messageId,
        hardDeleted: true,
      });
    }

    console.log(`🗑️  Message ${messageId} PERMANENTLY DELETED from DB`);

    return res.status(200).json({
      success: true,
      message: "Message permanently deleted",
    });
  } catch (error) {
    console.error("Delete for everyone error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ============================================
// 🔥 NEW: Bulk delete messages (for me)
// @route   POST /api/messages/bulk-delete-me
// @access  Private
// ============================================
const bulkDeleteForMe = async (req, res) => {
  try {
    const { messageIds } = req.body;

    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "messageIds array is required",
      });
    }

    let deletedCount = 0;
    for (const messageId of messageIds) {
      const message = await Message.findById(messageId);
      if (!message) continue;

      if (!message.deletedFor.includes(req.user._id)) {
        message.deletedFor.push(req.user._id);
        await message.save();
        deletedCount++;
      }

      // Hard-delete if both users deleted
      const chat = await Chat.findById(message.chat);
      if (chat) {
        const allDeleted = chat.participants.every((p) =>
          message.deletedFor.some((d) => d.toString() === p.toString()),
        );
        if (allDeleted) {
          if (message.media?.publicId) {
            await deleteFromCloudinary(
              message.media.publicId,
              message.messageType,
            );
          }
          await Message.findByIdAndDelete(messageId);
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: `Deleted ${deletedCount} message(s)`,
      count: deletedCount,
    });
  } catch (error) {
    console.error("Bulk delete error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ============================================
// 🔥 NEW: Bulk delete messages (for everyone)
// @route   POST /api/messages/bulk-delete-everyone
// @access  Private
// ============================================
const bulkDeleteForEveryone = async (req, res) => {
  try {
    const { messageIds } = req.body;

    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "messageIds array is required",
      });
    }

    let deletedCount = 0;
    const io = req.app.get("io");
    const chatBuckets = {};

    for (const messageId of messageIds) {
      const message = await Message.findById(messageId);
      if (!message) continue;

      // Only own messages can be deleted for everyone
      if (message.sender.toString() !== req.user._id.toString()) continue;

      const chatIdStr = message.chat.toString();
      if (!chatBuckets[chatIdStr]) chatBuckets[chatIdStr] = [];
      chatBuckets[chatIdStr].push(message._id.toString());

      if (message.media?.publicId) {
        await deleteFromCloudinary(message.media.publicId, message.messageType);
      }

      await Message.findByIdAndDelete(messageId);
      deletedCount++;
    }

    // Emit one batched event per chat
    if (io) {
      for (const [chatId, msgIds] of Object.entries(chatBuckets)) {
        msgIds.forEach((mId) => {
          io.to(chatId).emit("message_deleted", {
            chatId,
            messageId: mId,
            hardDeleted: true,
          });
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: `Deleted ${deletedCount} message(s) for everyone`,
      count: deletedCount,
    });
  } catch (error) {
    console.error("Bulk delete everyone error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ============================================
// @desc    Search messages
// ============================================
const searchMessages = async (req, res) => {
  try {
    const { q, chatId } = req.query;
    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Search query must be at least 2 characters",
      });
    }

    const query = {
      content: { $regex: q, $options: "i" },
      deletedFor: { $ne: req.user._id },
      deletedForEveryone: false,
    };

    if (chatId) {
      const chat = await Chat.findById(chatId);
      if (!chat || !chat.participants.includes(req.user._id)) {
        return res.status(403).json({
          success: false,
          message: "Not authorized",
        });
      }
      query.chat = chatId;
    } else {
      const userChats = await Chat.find({
        participants: req.user._id,
      }).select("_id");
      query.chat = { $in: userChats.map((c) => c._id) };
    }

    const messages = await Message.find(query)
      .populate("sender", "fullName username avatar")
      .populate("chat")
      .sort({ createdAt: -1 })
      .limit(50);

    return res.status(200).json({
      success: true,
      count: messages.length,
      messages,
    });
  } catch (error) {
    console.error("Search messages error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

module.exports = {
  getMessages,
  sendMessage,
  sendMediaMessage,
  editMessage,
  markSeen,
  deleteForMe,
  deleteForEveryone,
  bulkDeleteForMe,
  bulkDeleteForEveryone,
  searchMessages,
};
