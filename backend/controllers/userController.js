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

    // Search by username or fullName (case-insensitive)
    const users = await User.find({
      $and: [
        { _id: { $ne: req.user._id } }, // Exclude current user
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
    }).select("-password -socketId -lockedChats -chatLockPin");

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

    // Update only provided fields
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

module.exports = { searchUsers, getUserProfile, updateProfile };
