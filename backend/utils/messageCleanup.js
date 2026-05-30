const Message = require("../models/Message");

/**
 * Cleanup deleted messages older than 1 hour
 * Runs every 30 minutes
 */
const startMessageCleanup = () => {
  console.log("🧹 Message cleanup worker started");

  setInterval(
    async () => {
      try {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

        // Delete messages marked as deletedForEveryone older than 1 hour
        const result = await Message.deleteMany({
          deletedForEveryone: true,
          updatedAt: { $lt: oneHourAgo },
        });

        if (result.deletedCount > 0) {
          console.log(
            `🗑️  Cleaned up ${result.deletedCount} old deleted message(s)`,
          );
        }
      } catch (err) {
        console.error("Message cleanup error:", err.message);
      }
    },
    30 * 60 * 1000,
  ); // Every 30 minutes
};

module.exports = { startMessageCleanup };
