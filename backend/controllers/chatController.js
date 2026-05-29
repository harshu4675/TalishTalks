const Chat = require("../models/Chat");
const Message = require("../models/Message");
const User = require("../models/User");

// ============================================
// @desc    Get all chats for current user
// @route   GET /api/chats
// @access  Private
// ============================================
const getChats = async (req, res) => {
  try {
    const chats = await Chat.find({
      participants: req.user._id,
    })
      .populate("participants", "fullName username avatar isOnline lastSeen")
      .populate({
        path: "lastMessage",
        select: "content sender status createdAt deletedForEveryone",
      })
      .sort({ updatedAt: -1 });

    // Format chats to add "otherUser" field for convenience
    const formattedChats = chats.map((chat) => {
      const otherUser = chat.participants.find(
        (p) => p._id.toString() !== req.user._id.toString(),
      );
      return {
        _id: chat._id,
        otherUser,
        lastMessage: chat.lastMessage,
        disappearingMessages: chat.disappearingMessages,
        unreadCount: chat.unreadCount?.get(req.user._id.toString()) || 0,
        updatedAt: chat.updatedAt,
        createdAt: chat.createdAt,
      };
    });

    return res.status(200).json({
      success: true,
      count: formattedChats.length,
      chats: formattedChats,
    });
  } catch (error) {
    console.error("Get chats error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching chats",
    });
  }
};

// ============================================
// @desc    Create or get chat with a friend
// @route   POST /api/chats/create
// @access  Private
// ============================================
const createChat = async (req, res) => {
  try {
    const { friendId } = req.body;

    if (!friendId) {
      return res.status(400).json({
        success: false,
        message: "Friend ID is required",
      });
    }

    // Check if friend exists and is actually a friend
    const currentUser = await User.findById(req.user._id);
    if (!currentUser.friends.includes(friendId)) {
      return res.status(403).json({
        success: false,
        message: "You can only chat with friends",
      });
    }

    // Check if chat already exists between these users
    let chat = await Chat.findOne({
      participants: { $all: [req.user._id, friendId], $size: 2 },
    })
      .populate("participants", "fullName username avatar isOnline lastSeen")
      .populate("lastMessage");

    if (!chat) {
      // Create new chat
      chat = await Chat.create({
        participants: [req.user._id, friendId],
      });

      chat = await Chat.findById(chat._id)
        .populate("participants", "fullName username avatar isOnline lastSeen")
        .populate("lastMessage");
    }

    // Format response
    const otherUser = chat.participants.find(
      (p) => p._id.toString() !== req.user._id.toString(),
    );

    return res.status(200).json({
      success: true,
      chat: {
        _id: chat._id,
        otherUser,
        lastMessage: chat.lastMessage,
        disappearingMessages: chat.disappearingMessages,
        unreadCount: chat.unreadCount?.get(req.user._id.toString()) || 0,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
      },
    });
  } catch (error) {
    console.error("Create chat error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error while creating chat",
    });
  }
};

// ============================================
// @desc    Clear all messages in a chat (for current user)
// @route   PUT /api/chats/:chatId/clear
// @access  Private
// ============================================
const clearChat = async (req, res) => {
  try {
    const { chatId } = req.params;

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Chat not found",
      });
    }

    // Verify user is a participant
    if (!chat.participants.includes(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: "You are not a participant in this chat",
      });
    }

    // Mark all messages as deleted for this user
    await Message.updateMany(
      { chat: chatId },
      { $addToSet: { deletedFor: req.user._id } },
    );

    // Track clear timestamp for this user
    chat.clearedBy = chat.clearedBy.filter(
      (c) => c.user.toString() !== req.user._id.toString(),
    );
    chat.clearedBy.push({ user: req.user._id, clearedAt: new Date() });
    await chat.save();

    return res.status(200).json({
      success: true,
      message: "Chat cleared successfully",
    });
  } catch (error) {
    console.error("Clear chat error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error while clearing chat",
    });
  }
};

// ============================================
// @desc    Set disappearing messages mode
// @route   PUT /api/chats/:chatId/disappearing
// @access  Private
// ============================================
const setDisappearing = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { mode } = req.body; // 'on_seen' | 'after_2min' | 'off'

    if (!["on_seen", "after_2min", "off"].includes(mode)) {
      return res.status(400).json({
        success: false,
        message: "Invalid mode",
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

    chat.disappearingMessages = {
      mode: mode,
      enabled: mode !== "off",
    };
    await chat.save();

    // Notify other participant via socket
    const io = req.app.get("io");
    if (io) {
      io.to(chatId).emit("disappearing_mode_changed", {
        chatId,
        disappearingMessages: chat.disappearingMessages,
        changedBy: req.user._id,
      });
    }

    return res.status(200).json({
      success: true,
      message:
        mode === "off"
          ? "Disappearing messages disabled"
          : mode === "on_seen"
            ? "Messages will disappear when seen 👁️"
            : "Messages will disappear 2 min after being seen ⏱️",
      disappearingMessages: chat.disappearingMessages,
    });
  } catch (error) {
    console.error("Set disappearing error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
const bcrypt = require("bcryptjs");

// ============================================
// @desc    Lock a chat with PIN
// @route   PUT /api/chats/:chatId/lock
// @access  Private
// ============================================
const lockChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { pin } = req.body;

    if (!pin || pin.length < 4) {
      return res.status(400).json({
        success: false,
        message: "PIN must be at least 4 characters",
      });
    }

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res
        .status(404)
        .json({ success: false, message: "Chat not found" });
    }

    if (!chat.participants.includes(req.user._id)) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    }

    // Hash the PIN
    const salt = await bcrypt.genSalt(10);
    const hashedPin = await bcrypt.hash(pin, salt);

    // Save to user's lock data
    const user = await User.findById(req.user._id);
    user.chatLockPin = hashedPin;
    if (!user.lockedChats.includes(chatId)) {
      user.lockedChats.push(chatId);
    }
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Chat locked successfully 🔒",
    });
  } catch (error) {
    console.error("Lock chat error:", error.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ============================================
// @desc    Unlock a chat with PIN
// @route   PUT /api/chats/:chatId/unlock
// @access  Private
// ============================================
const unlockChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { pin } = req.body;

    if (!pin) {
      return res.status(400).json({ success: false, message: "PIN required" });
    }

    const user = await User.findById(req.user._id).select("+chatLockPin");
    if (!user || !user.chatLockPin) {
      return res.status(400).json({
        success: false,
        message: "No PIN is set for your chats",
      });
    }

    const isMatch = await bcrypt.compare(pin, user.chatLockPin);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Incorrect PIN",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Chat unlocked 🔓",
    });
  } catch (error) {
    console.error("Unlock chat error:", error.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ============================================
// @desc    Remove lock from chat
// @route   PUT /api/chats/:chatId/remove-lock
// @access  Private
// ============================================
const removeLock = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { pin } = req.body;

    const user = await User.findById(req.user._id).select("+chatLockPin");
    if (!user.chatLockPin) {
      return res.status(400).json({ success: false, message: "No lock set" });
    }

    const isMatch = await bcrypt.compare(pin, user.chatLockPin);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Incorrect PIN" });
    }

    user.lockedChats = user.lockedChats.filter(
      (id) => id.toString() !== chatId,
    );

    // If no more locked chats, remove the PIN
    if (user.lockedChats.length === 0) {
      user.chatLockPin = "";
    }
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Lock removed successfully",
    });
  } catch (error) {
    console.error("Remove lock error:", error.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ============================================
// @desc    Get locked chats list
// @route   GET /api/chats/locked
// @access  Private
// ============================================
const getLockedChats = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    return res.status(200).json({
      success: true,
      lockedChats: user.lockedChats,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  getChats,
  createChat,
  clearChat,
  setDisappearing,
  lockChat,
  unlockChat,
  removeLock,
  getLockedChats,
};
