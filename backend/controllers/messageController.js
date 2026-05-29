const Message = require("../models/Message");
const Chat = require("../models/Chat");

const { sendPushToUser } = require("../utils/pushService");
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

    // Build query - EXCLUDE deletedForEveryone messages completely
    const query = {
      chat: chatId,
      deletedFor: { $ne: req.user._id },
      deletedForEveryone: false, // ⚠️ Don't return deleted messages at all
    };

    if (clearedAt) {
      query.createdAt = { $gt: clearedAt };
    }

    const messages = await Message.find(query)
      .populate("sender", "fullName username avatar")
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
// @route   POST /api/messages/send
// @access  Private
// ============================================
const sendMessage = async (req, res) => {
  try {
    const { chatId, content } = req.body;

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

    // Create the message
    let message = await Message.create({
      chat: chatId,
      sender: req.user._id,
      content: content.trim(),
      status: "sent",
    });

    // Populate sender info
    message = await Message.findById(message._id).populate(
      "sender",
      "fullName username avatar",
    );

    // Update chat's last message + unread count for other participant
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

    // Emit via Socket.IO to all participants in the chat room
    const io = req.app.get("io");
    if (io) {
      // To the chat room (anyone viewing this chat)
      io.to(chatId).emit("new_message", {
        chatId,
        message,
      });

      // Also send to other user's personal room (for notification even when not in chat)
      if (otherParticipantId) {
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
      }
      // 🔔 Send push notification (works even when app is closed)
      if (otherParticipantId) {
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
// @route   PUT /api/messages/:chatId/seen
// @access  Private
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

    // Find messages from OTHER user that are NOT seen yet
    const messagesToUpdate = await Message.find({
      chat: chatId,
      sender: { $ne: req.user._id },
      status: { $ne: "seen" },
      deletedForEveryone: false,
    });

    if (messagesToUpdate.length === 0) {
      // Still reset unread count
      chat.unreadCount.set(req.user._id.toString(), 0);
      await chat.save();
      return res.status(200).json({
        success: true,
        message: "No new messages to mark",
        count: 0,
      });
    }

    // Update status to seen
    await Message.updateMany(
      {
        _id: { $in: messagesToUpdate.map((m) => m._id) },
      },
      {
        $set: {
          status: "seen",
          seenAt: now,
        },
      },
    );

    // Reset unread count
    chat.unreadCount.set(req.user._id.toString(), 0);
    await chat.save();

    // Handle auto-delete based on disappearing mode
    // In markSeen function, REPLACE the disappearing block:
    if (
      chat.disappearingMessages?.mode &&
      chat.disappearingMessages.mode !== "off"
    ) {
      const messageIds = messagesToUpdate.map((m) => m._id);
      const mode = chat.disappearingMessages.mode;

      let deleteAt = null;
      let delayMs = 0;

      if (mode === "on_seen") {
        delayMs = 5 * 1000; // 5 seconds
        deleteAt = new Date(Date.now() + delayMs);
      } else if (mode === "after_2min") {
        delayMs = 2 * 60 * 1000; // 2 minutes
        deleteAt = new Date(Date.now() + delayMs);
      }

      if (deleteAt) {
        await Message.updateMany(
          { _id: { $in: messageIds } },
          { $set: { autoDeleteAt: deleteAt } },
        );

        // 🔥 Schedule actual deletion + emit to clients
        const io = req.app.get("io");
        setTimeout(async () => {
          try {
            await Message.updateMany(
              { _id: { $in: messageIds } },
              {
                $set: {
                  deletedForEveryone: true,
                  content: "",
                },
              },
            );

            // Notify clients to remove messages from UI
            if (io) {
              messageIds.forEach((msgId) => {
                io.to(chatId).emit("message_deleted", {
                  chatId,
                  messageId: msgId,
                  disappeared: true,
                });
              });
            }
            console.log(
              `🗑️  Auto-deleted ${messageIds.length} disappearing message(s)`,
            );
          } catch (err) {
            console.error("Auto-delete error:", err.message);
          }
        }, delayMs);

        console.log(
          `⏱️  Scheduled ${messageIds.length} message(s) to disappear in ${delayMs}ms`,
        );
      }
    }

    // Emit seen event via Socket.IO
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
// @desc    Delete message for everyone
// @route   DELETE /api/messages/:messageId/everyone
// @access  Private
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

    // Only sender can delete for everyone
    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own messages for everyone",
      });
    }

    message.deletedForEveryone = true;
    message.content = "This message was deleted";
    await message.save();

    // Notify all participants via Socket.IO
    const io = req.app.get("io");
    if (io) {
      io.to(message.chat.toString()).emit("message_deleted", {
        chatId: message.chat,
        messageId: message._id,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Message deleted for everyone",
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
// @route   GET /api/messages/search?q=query&chatId=...
// @access  Private
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
      // Search within specific chat
      const chat = await Chat.findById(chatId);
      if (!chat || !chat.participants.includes(req.user._id)) {
        return res.status(403).json({
          success: false,
          message: "Not authorized",
        });
      }
      query.chat = chatId;
    } else {
      // Search in all user's chats
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
