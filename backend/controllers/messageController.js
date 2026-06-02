const Message = require("../models/Message");
const Chat = require("../models/Chat");
const { sendPushToUser } = require("../utils/pushService");
const { deleteFromCloudinary } = require("../utils/cloudinary");

// ... your existing functions (getMessages, sendMessage, etc.) ...

// ============================================
// @desc    Send media message (image/video)
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
      // Delete uploaded file from cloudinary
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

    const isVideo = req.file.mimetype.startsWith("video/");
    const messageType = isVideo ? "video" : "image";

    // 🔥 Auto-delete after 2 minutes
    const mediaAutoDeleteAt = new Date(Date.now() + 2 * 60 * 1000);

    // Generate video thumbnail URL from Cloudinary
    let thumbnail = "";
    if (isVideo && req.file.path) {
      thumbnail = req.file.path.replace(/\.[^/.]+$/, ".jpg");
    }

    // Create message
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

    // Populate
    message = await Message.findById(message._id)
      .populate("sender", "fullName username avatar")
      .populate({
        path: "replyTo",
        select: "content sender messageType media",
        populate: { path: "sender", select: "fullName username" },
      });

    // Update chat
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

    // Emit via socket
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

      // Push notification
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

    // Save original content if first edit
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
        select: "content sender",
        populate: { path: "sender", select: "fullName username" },
      });

    // Emit to participants
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
// Update deleteForEveryone to also delete media
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

    // 🔥 Delete media from Cloudinary if exists
    if (message.media?.publicId) {
      await deleteFromCloudinary(message.media.publicId, message.messageType);
    }

    // Hard delete from DB
    await Message.findByIdAndDelete(messageId);

    const io = req.app.get("io");
    if (io) {
      io.to(chatId.toString()).emit("message_deleted", {
        chatId,
        messageId,
        hardDeleted: true,
      });
    }

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

// Update module.exports
module.exports = {
  getMessages,
  sendMessage,
  sendMediaMessage, // 🔥 NEW
  editMessage, // 🔥 NEW
  markSeen,
  deleteForMe,
  deleteForEveryone,
  searchMessages,
};
