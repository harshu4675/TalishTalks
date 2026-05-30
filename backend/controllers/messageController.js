const Message = require("../models/Message");
const Chat = require("../models/Chat");
const { sendPushToUser } = require("../utils/pushService");

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
    };

    if (clearedAt) {
      query.createdAt = { $gt: clearedAt };
    }

    const messages = await Message.find(query)
      .populate("sender", "fullName username avatar")
      .populate({
        path: "replyTo",
        select: "content sender",
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
// @desc    Send a new message
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
        select: "content sender",
        populate: { path: "sender", select: "fullName username" },
      });

    const otherParticipantId = chat.participants.find(
      (p) => p.toString() !== req.user._id.toString(),
    );

    if (otherParticipantId) {
      const currentUnread =
        chat.unreadCount?.get(otherParticipantId.toString()) || 0;
      chat.unreadCount.set(otherParticipantId.toString(), currentUnread + 1);
    }
    chat.lastMessage = message._id;
    await chat.save();

    const io = req.app.get("io");
    if (io) {
      if (otherParticipantId) {
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
    });

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

    // 🔥 HARD DELETE based on disappearing mode
    if (
      chat.disappearingMessages?.mode &&
      chat.disappearingMessages.mode !== "off"
    ) {
      const messageIds = messagesToUpdate.map((m) => m._id);
      const mode = chat.disappearingMessages.mode;

      let delayMs = 0;

      if (mode === "on_seen") {
        delayMs = 5 * 1000; // 5 seconds
      } else if (mode === "after_2min") {
        delayMs = 2 * 60 * 1000; // 2 minutes
      }

      if (delayMs > 0) {
        const io = req.app.get("io");

        setTimeout(async () => {
          try {
            // 🔥 HARD DELETE - Permanently remove from database
            const result = await Message.deleteMany({
              _id: { $in: messageIds },
            });

            // Notify clients to remove from UI
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
              `🗑️  PERMANENTLY DELETED ${result.deletedCount} disappearing message(s) from DB`,
            );
          } catch (err) {
            console.error("Hard delete error:", err.message);
          }
        }, delayMs);

        console.log(
          `⏱️  Scheduled ${messageIds.length} message(s) for PERMANENT DELETION in ${delayMs}ms`,
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

    // Add user to deletedFor array
    if (!message.deletedFor.includes(req.user._id)) {
      message.deletedFor.push(req.user._id);
      await message.save();
    }

    // 🔥 If BOTH users have deleted it, permanently remove from DB
    const chat = await Chat.findById(message.chat);
    if (chat) {
      const allParticipantsDeleted = chat.participants.every((p) =>
        message.deletedFor.some((d) => d.toString() === p.toString()),
      );

      if (allParticipantsDeleted) {
        await Message.findByIdAndDelete(messageId);
        console.log(
          `🗑️  Both users deleted - permanently removed message from DB`,
        );
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
        message: "You can only delete your own messages for everyone",
      });
    }

    const chatId = message.chat;

    // 🔥 HARD DELETE - Permanently remove from database
    await Message.findByIdAndDelete(messageId);

    // Notify all participants
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
  markSeen,
  deleteForMe,
  deleteForEveryone,
  searchMessages,
};
