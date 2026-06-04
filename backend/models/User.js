const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    // Full name of the user
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [50, "Name cannot exceed 50 characters"],
    },

    // Unique username for friend system
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
      lowercase: true,
      minlength: [3, "Username must be at least 3 characters"],
      maxlength: [20, "Username cannot exceed 20 characters"],
      match: [
        /^[a-zA-Z0-9_]+$/,
        "Username can only contain letters, numbers, and underscores",
      ],
    },

    // Email for authentication
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email",
      ],
    },

    // Hashed password
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false,
    },

    // Profile picture URL
    avatar: {
      type: String,
      default: "",
    },
    // Add after avatar field:
    avatarPublicId: {
      type: String,
      default: "",
    },

    // About/Bio text
    about: {
      type: String,
      default: "Hey there! I am using Talish Talks 💬",
      maxlength: [150, "About cannot exceed 150 characters"],
    },

    // Online/Offline status
    isOnline: {
      type: Boolean,
      default: false,
    },

    // Push notification subscriptions
    pushSubscriptions: [
      {
        endpoint: String,
        keys: {
          p256dh: String,
          auth: String,
        },
        userAgent: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],

    // Last seen timestamp
    lastSeen: {
      type: Date,
      default: Date.now,
    },

    // Friends list - array of user IDs
    friends: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // Socket ID for real-time features
    socketId: {
      type: String,
      default: "",
    },

    // Chat lock PIN (encrypted) - one PIN for all locked chats
    chatLockPin: {
      type: String,
      default: "",
      select: false,
    },

    // Locked chats array
    lockedChats: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Chat",
      },
    ],

    // 🔥 NEW: Blocked users array
    blockedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // 🔥 NEW: Pinned chats (max 3, like WhatsApp)
    pinnedChats: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Chat",
      },
    ],

    // 🔥 NEW: Muted chats (no notifications)
    mutedChats: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Chat",
      },
    ],

    // 🔥 NEW: Chats marked as unread by user (visual flag only)
    markedUnreadChats: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Chat",
      },
    ],
  },
  {
    timestamps: true,
  },
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate default avatar
userSchema.pre("save", function (next) {
  if (!this.avatar) {
    this.avatar = `https://api.dicebear.com/7.x/initials/svg?seed=${this.username}&backgroundColor=E8713A&textColor=ffffff`;
  }
  next();
});

// 🔥 NEW: Helper method to check if a user is blocked
userSchema.methods.hasBlocked = function (userId) {
  return this.blockedUsers.some((id) => id.toString() === userId.toString());
};

const User = mongoose.model("User", userSchema);

module.exports = User;
