const mongoose = require("mongoose");

const storySchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  text: { type: String, default: "", maxlength: 500 },
  media: {
    url: { type: String, default: "" },
    publicId: { type: String, default: "" },
    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 },
  },
  viewers: [{
    _id: false,
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    viewedAt: { type: Date, default: Date.now },
  }],
  expiresAt: { type: Date, required: true },
}, { timestamps: true });

storySchema.index({ author: 1, createdAt: -1 });
storySchema.index({ expiresAt: 1 });
module.exports = mongoose.model("Story", storySchema);
