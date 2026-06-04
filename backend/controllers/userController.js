const User = require("../models/User");

// ============================================
// @desc    Search users by username
// @route   GET /api/users/search?q=query
// @access  Private
// ============================================
const searchUsers = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Search query must be at least 2 characters",
      });
    }

    // 🔥 Get current user to exclude blocked users from search
    const currentUser = await User.findById(req.user._id);
    const blockedIds = currentUser.blockedUsers || [];

    const users = await User.find({
      $and: [
        { _id: { $ne: req.user._id } },
        { _id: { $nin: blockedIds } }, // exclude users I blocked
        { blockedUsers: { $ne: req.user._id } }, // exclude users who blocked me
        {
          $or: [
            { username: { $regex: q, $options: "i" } },
            { fullName: { $regex: q, $options: "i" } },
          ],
        },
      ],
    })
      .select("fullName username avatar about isOnline")
      .limit(20);

    return res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    console.error("Search users error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error while searching users",
    });
  }
};

// ============================================
// @desc    Get user profile by username
// @route   GET /api/users/profile/:username
// @access  Private
// ============================================
const getUserProfile = async (req, res) => {
  try {
    const { username } = req.params;

    const user = await User.findOne({
      username: username.toLowerCase(),
    }).select(
      "-password -socketId -lockedChats -chatLockPin -blockedUsers -pinnedChats -mutedChats -markedUnreadChats",
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Get user profile error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching profile",
    });
  }
};

// ============================================
// @desc    Update current user profile
// @route   PUT /api/users/profile
// @access  Private
// ============================================
const updateProfile = async (req, res) => {
  try {
    const { fullName, about, avatar } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (fullName !== undefined) {
      if (fullName.trim().length < 2 || fullName.trim().length > 50) {
        return res.status(400).json({
          success: false,
          message: "Full name must be between 2 and 50 characters",
        });
      }
      user.fullName = fullName.trim();
    }

    if (about !== undefined) {
      if (about.length > 150) {
        return res.status(400).json({
          success: false,
          message: "About cannot exceed 150 characters",
        });
      }
      user.about = about;
    }

    if (avatar !== undefined) {
      user.avatar = avatar;
    }

    const updatedUser = await user.save();

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully ✨",
      user: {
        _id: updatedUser._id,
        fullName: updatedUser.fullName,
        username: updatedUser.username,
        email: updatedUser.email,
        avatar: updatedUser.avatar,
        about: updatedUser.about,
      },
    });
  } catch (error) {
    console.error("Update profile error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error while updating profile",
    });
  }
};

// ============================================
// 🔥 NEW: Block a user
// @route   POST /api/users/block/:userId
// @access  Private
// ============================================
const blockUser = async (req, res) => {
  try {
    const { userId } = req.params;

    if (userId === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot block yourself",
      });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const currentUser = await User.findById(req.user._id);

    // Already blocked?
    if (currentUser.blockedUsers.includes(userId)) {
      return res.status(400).json({
        success: false,
        message: "User is already blocked",
      });
    }

    // Add to blocked
    currentUser.blockedUsers.push(userId);

    // Remove from friends (both sides) if friends
    currentUser.friends = currentUser.friends.filter(
      (id) => id.toString() !== userId,
    );
    targetUser.friends = targetUser.friends.filter(
      (id) => id.toString() !== req.user._id.toString(),
    );

    await currentUser.save();
    await targetUser.save();

    // Notify the blocked user via socket
    const io = req.app.get("io");
    if (io) {
      io.to(userId).emit("user_blocked_you", {
        blockedBy: req.user._id,
      });
    }

    return res.status(200).json({
      success: true,
      message: `${targetUser.fullName} has been blocked 🚫`,
    });
  } catch (error) {
    console.error("Block user error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ============================================
// 🔥 NEW: Unblock a user
// @route   POST /api/users/unblock/:userId
// @access  Private
// ============================================
const unblockUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const currentUser = await User.findById(req.user._id);

    if (!currentUser.blockedUsers.includes(userId)) {
      return res.status(400).json({
        success: false,
        message: "User is not blocked",
      });
    }

    currentUser.blockedUsers = currentUser.blockedUsers.filter(
      (id) => id.toString() !== userId,
    );

    await currentUser.save();

    const io = req.app.get("io");
    if (io) {
      io.to(userId).emit("user_unblocked_you", {
        unblockedBy: req.user._id,
      });
    }

    return res.status(200).json({
      success: true,
      message: "User unblocked ✓",
    });
  } catch (error) {
    console.error("Unblock user error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ============================================
// 🔥 NEW: Get list of blocked users
// @route   GET /api/users/blocked
// @access  Private
// ============================================
const getBlockedUsers = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate(
      "blockedUsers",
      "fullName username avatar",
    );

    return res.status(200).json({
      success: true,
      count: user.blockedUsers.length,
      blockedUsers: user.blockedUsers,
    });
  } catch (error) {
    console.error("Get blocked users error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

module.exports = {
  searchUsers,
  getUserProfile,
  updateProfile,
  blockUser,
  unblockUser,
  getBlockedUsers,
};
