const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema(
  {
    // Participants in the chat (2 users for private chat)
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],

    // Reference to the last message for preview
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },

    // Disappearing messages settings
    disappearingMessages: {
      enabled: {
        type: Boolean,
        default: false,
      },
      // 'on_seen' = delete when seen, 'after_2min' = delete 2 min after seen
      mode: {
        type: String,
        enum: ["on_seen", "after_2min", "off"],
        default: "off",
      },
    },

    // Unread count for each participant
    unreadCount: {
      type: Map,
      of: Number,
      default: {},
    },

    // Track which users have cleared the chat (and when)
    clearedBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        clearedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  },
);

// Index for fast lookup of chats by participants
chatSchema.index({ participants: 1 });

const Chat = mongoose.model("Chat", chatSchema);

module.exports = Chat;
