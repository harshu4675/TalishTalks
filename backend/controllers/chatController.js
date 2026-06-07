const Chat = require("../models/Chat");
const Message = require("../models/Message");
const User = require("../models/User");
const bcrypt = require("bcryptjs");

const MAX_PINNED_CHATS = 3;

const getChats = async (req, res) => {
  try {
    const chats = await Chat.find({
      participants: req.user._id,
    })
      .populate("participants", "fullName username avatar isOnline lastSeen")
      .populate({
        path: "lastMessage",
        select:
          "content sender status createdAt deletedForEveryone messageType",
      })
      .sort({ updatedAt: -1 });

    const currentUser = await User.findById(req.user._id).select(
      "blockedUsers pinnedChats mutedChats markedUnreadChats lockedChats",
    );

    const blockedSet = new Set(
      (currentUser.blockedUsers || []).map((id) => id.toString()),
    );
    const pinnedSet = new Set(
      (currentUser.pinnedChats || []).map((id) => id.toString()),
    );
    const mutedSet = new Set(
      (currentUser.mutedChats || []).map((id) => id.toString()),
    );
    const markedUnreadSet = new Set(
      (currentUser.markedUnreadChats || []).map((id) => id.toString()),
    );
    const lockedSet = new Set(
      (currentUser.lockedChats || []).map((id) => id.toString()),
    );

    const formattedChats = chats.map((chat) => {
      const otherUser = chat.participants.find(
        (p) => p._id.toString() !== req.user._id.toString(),
      );

      const chatIdStr = chat._id.toString();
      const otherUserIdStr = otherUser?._id.toString();

      return {
        _id: chat._id,
        otherUser,
        lastMessage: chat.lastMessage,
        disappearingMessages: chat.disappearingMessages,
        unreadCount: chat.unreadCount?.get(req.user._id.toString()) || 0,
        updatedAt: chat.updatedAt,
        createdAt: chat.createdAt,

        isPinned: pinnedSet.has(chatIdStr),
        isMuted: mutedSet.has(chatIdStr),
        isMarkedUnread: markedUnreadSet.has(chatIdStr),
        isLocked: lockedSet.has(chatIdStr),
        isBlocked: otherUserIdStr ? blockedSet.has(otherUserIdStr) : false,
      };
    });

    formattedChats.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
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

const createChat = async (req, res) => {
  try {
    const { friendId } = req.body;

    if (!friendId) {
      return res.status(400).json({
        success: false,
        message: "Friend ID is required",
      });
    }

    const currentUser = await User.findById(req.user._id);
    if (!currentUser.friends.includes(friendId)) {
      return res.status(403).json({
        success: false,
        message: "You can only chat with friends",
      });
    }

    if (currentUser.blockedUsers.includes(friendId)) {
      return res.status(403).json({
        success: false,
        message: "You have blocked this user. Unblock to chat.",
      });
    }

    const otherUser = await User.findById(friendId);
    if (otherUser && otherUser.blockedUsers.includes(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: "You cannot chat with this user.",
      });
    }

    let chat = await Chat.findOne({
      participants: { $all: [req.user._id, friendId], $size: 2 },
    })
      .populate("participants", "fullName username avatar isOnline lastSeen")
      .populate("lastMessage");

    if (!chat) {
      chat = await Chat.create({
        participants: [req.user._id, friendId],
      });

      chat = await Chat.findById(chat._id)
        .populate("participants", "fullName username avatar isOnline lastSeen")
        .populate("lastMessage");
    }

    const otherUserData = chat.participants.find(
      (p) => p._id.toString() !== req.user._id.toString(),
    );

    return res.status(200).json({
      success: true,
      chat: {
        _id: chat._id,
        otherUser: otherUserData,
        lastMessage: chat.lastMessage,
        disappearingMessages: chat.disappearingMessages,
        unreadCount: chat.unreadCount?.get(req.user._id.toString()) || 0,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
        isPinned: false,
        isMuted: false,
        isMarkedUnread: false,
        isLocked: false,
        isBlocked: false,
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

    if (!chat.participants.includes(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: "You are not a participant in this chat",
      });
    }

    const messages = await Message.find({ chat: chatId });

    const { deleteFromCloudinary } = require("../utils/cloudinary");
    for (const msg of messages) {
      if (msg.media?.publicId) {
        await deleteFromCloudinary(msg.media.publicId, msg.messageType);
      }
    }

    const result = await Message.deleteMany({ chat: chatId });
    console.log(`🗑️  Chat cleared - deleted ${result.deletedCount} messages`);

    chat.lastMessage = null;

    chat.participants.forEach((participantId) => {
      chat.unreadCount.set(participantId.toString(), 0);
    });

    await chat.save();

    const io = req.app.get("io");
    if (io) {
      io.to(chatId).emit("chat_cleared", {
        chatId,
        clearedBy: req.user._id,
        clearedByName: req.user.fullName,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Chat cleared for everyone",
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Clear chat error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error while clearing chat",
    });
  }
};

const setDisappearing = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { mode } = req.body;

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
            ? "Messages will disappear when seen "
            : "Messages will disappear 2 min after being seen ",
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

    const user = await User.findById(req.user._id).select("+chatLockPin");

    if (user.chatLockPin) {
      const isMatch = await bcrypt.compare(pin, user.chatLockPin);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: "Incorrect PIN. Use your existing chat lock PIN.",
        });
      }
    } else {
      const salt = await bcrypt.genSalt(10);
      user.chatLockPin = await bcrypt.hash(pin, salt);
    }

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

const togglePinChat = async (req, res) => {
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

    const user = await User.findById(req.user._id);
    const isPinned = user.pinnedChats.some((id) => id.toString() === chatId);

    if (isPinned) {
      user.pinnedChats = user.pinnedChats.filter(
        (id) => id.toString() !== chatId,
      );
      await user.save();
      return res.status(200).json({
        success: true,
        message: "Chat unpinned",
        isPinned: false,
      });
    } else {
      // Pin (check max limit)
      if (user.pinnedChats.length >= MAX_PINNED_CHATS) {
        return res.status(400).json({
          success: false,
          message: `You can only pin up to ${MAX_PINNED_CHATS} chats. Unpin one first.`,
        });
      }

      user.pinnedChats.push(chatId);
      await user.save();
      return res.status(200).json({
        success: true,
        message: "Chat pinned 📌",
        isPinned: true,
      });
    }
  } catch (error) {
    console.error("Toggle pin error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
const toggleMuteChat = async (req, res) => {
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

    const user = await User.findById(req.user._id);
    const isMuted = user.mutedChats.some((id) => id.toString() === chatId);

    if (isMuted) {
      user.mutedChats = user.mutedChats.filter(
        (id) => id.toString() !== chatId,
      );
      await user.save();
      return res.status(200).json({
        success: true,
        message: "Chat unmuted 🔔",
        isMuted: false,
      });
    } else {
      user.mutedChats.push(chatId);
      await user.save();
      return res.status(200).json({
        success: true,
        message: "Chat muted 🔇",
        isMuted: true,
      });
    }
  } catch (error) {
    console.error("Toggle mute error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ============================================
// 🔥 NEW: Toggle mark as unread (visual flag only)
// @route   PUT /api/chats/:chatId/mark-unread
// @access  Private
// ============================================
const toggleMarkUnread = async (req, res) => {
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

    const user = await User.findById(req.user._id);
    const isMarked = user.markedUnreadChats.some(
      (id) => id.toString() === chatId,
    );

    if (isMarked) {
      user.markedUnreadChats = user.markedUnreadChats.filter(
        (id) => id.toString() !== chatId,
      );
      await user.save();
      return res.status(200).json({
        success: true,
        message: "Marked as read",
        isMarkedUnread: false,
      });
    } else {
      user.markedUnreadChats.push(chatId);
      await user.save();
      return res.status(200).json({
        success: true,
        message: "Marked as unread",
        isMarkedUnread: true,
      });
    }
  } catch (error) {
    console.error("Toggle mark unread error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ============================================
// 🔥 NEW: Delete chat (and all messages) just for this user
// @route   DELETE /api/chats/:chatId
// @access  Private
// ============================================
const deleteChat = async (req, res) => {
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

    // Mark as cleared for this user at this moment
    const existingClear = chat.clearedBy.find(
      (c) => c.user.toString() === req.user._id.toString(),
    );

    if (existingClear) {
      existingClear.clearedAt = new Date();
    } else {
      chat.clearedBy.push({
        user: req.user._id,
        clearedAt: new Date(),
      });
    }

    // Reset unread count + last message visibility for this user
    chat.unreadCount.set(req.user._id.toString(), 0);

    await chat.save();

    // Also clean up user's pin/mute/mark-unread/locked flags for this chat
    const user = await User.findById(req.user._id);
    user.pinnedChats = user.pinnedChats.filter(
      (id) => id.toString() !== chatId,
    );
    user.mutedChats = user.mutedChats.filter((id) => id.toString() !== chatId);
    user.markedUnreadChats = user.markedUnreadChats.filter(
      (id) => id.toString() !== chatId,
    );
    user.lockedChats = user.lockedChats.filter(
      (id) => id.toString() !== chatId,
    );
    if (user.lockedChats.length === 0) {
      user.chatLockPin = "";
    }
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Chat deleted",
    });
  } catch (error) {
    console.error("Delete chat error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
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
  togglePinChat,
  toggleMuteChat,
  toggleMarkUnread,
  deleteChat,
};
