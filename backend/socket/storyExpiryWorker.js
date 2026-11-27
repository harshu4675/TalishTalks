const mongoose = require("mongoose");
const Story = require("../models/Story");
const { deleteFromCloudinary } = require("../utils/cloudinary");

const runStoryExpiry = async () => {
  if (mongoose.connection.readyState !== 1) return;
  const now = new Date();
  const expired = await Story.find({ expiresAt: { $lte: now } }).select("_id media.publicId").sort({ expiresAt: 1 }).limit(100);
  for (const story of expired) {
    if (story.media?.publicId) {
      const result = await deleteFromCloudinary(story.media.publicId);
      if (!result) continue;
    }
    await Story.deleteOne({ _id: story._id, expiresAt: { $lte: now } });
  }
};

const startStoryExpiryWorker = () => {
  let running = false;
  let timer;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await runStoryExpiry();
    } catch (error) {
      console.error("Story expiry worker failed:", error.message);
    } finally {
      running = false;
    }
  };
  const start = () => {
    if (timer) return;
    timer = setInterval(tick, 60_000);
    timer.unref();
    void tick();
  };
  if (mongoose.connection.readyState === 1) start();
  else mongoose.connection.once("connected", start);
  return () => {
    clearInterval(timer);
    mongoose.connection.off("connected", start);
  };
};

module.exports = startStoryExpiryWorker;
module.exports.runStoryExpiry = runStoryExpiry;
