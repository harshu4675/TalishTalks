const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    chat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    clientId: { type: String, maxlength: 100 },
    content: {
      type: String,
      default: "",
    },
    messageType: {
      type: String,
      enum: ["text", "image", "video"],
      default: "text",
    },
    media: {
      url: { type: String, default: "" },
      publicId: { type: String, default: "" },
      type: { type: String, default: "" },
      width: { type: Number, default: 0 },
      height: { type: Number, default: 0 },
      duration: { type: Number, default: 0 },
      size: { type: Number, default: 0 },
      thumbnail: { type: String, default: "" },
    },
    edited: {
      type: Boolean,
      default: false,
    },
    editedAt: {
      type: Date,
      default: null,
    },
    originalContent: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["sending", "sent", "delivered", "seen"],
      default: "sent",
    },
    seenAt: {
      type: Date,
      default: null,
    },
    deletedFor: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    deletedForEveryone: {
      type: Boolean,
      default: false,
    },
    autoDeleteAt: {
      type: Date,
      default: null,
    },
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
    mediaAutoDeleteAt: {
      type: Date,
      default: null,
    },
    // Persist per-recipient cleanup deadlines so server restarts do not lose jobs.
    disappearingFor: [
      {
        _id: false,
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        deleteAt: { type: Date, required: true },
      },
    ],
  },
  {
    timestamps: true,
  },
);

messageSchema.index({ chat: 1, createdAt: -1, _id: -1 });
messageSchema.index({ mediaAutoDeleteAt: 1 });
messageSchema.index({ "disappearingFor.deleteAt": 1 });
messageSchema.index({ autoDeleteAt: 1 });
messageSchema.index({ chat: 1, sender: 1, clientId: 1 }, {
  unique: true, partialFilterExpression: { clientId: { $type: "string" } },
});

module.exports = mongoose.model("Message", messageSchema);
