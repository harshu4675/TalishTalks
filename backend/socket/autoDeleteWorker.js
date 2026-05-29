const mongoose = require("mongoose");
const Message = require("../models/Message");

const startAutoDeleteWorker = (io) => {
  console.log("🕐 Auto-delete worker started");

  const startInterval = () => {
    // Run every 3 seconds for faster response
    setInterval(async () => {
      if (mongoose.connection.readyState !== 1) {
        return;
      }

      try {
        const now = new Date();

        // Find messages where autoDeleteAt has passed AND not yet deleted
        const messagesToDelete = await Message.find({
          autoDeleteAt: { $lte: now, $ne: null },
          deletedForEveryone: false,
        }).select("_id chat");

        if (messagesToDelete.length === 0) return;

        // Group by chat
        const byChatId = {};
        messagesToDelete.forEach((msg) => {
          const chatId = msg.chat.toString();
          if (!byChatId[chatId]) byChatId[chatId] = [];
          byChatId[chatId].push(msg._id);
        });

        // Process each chat
        for (const chatId of Object.keys(byChatId)) {
          const messageIds = byChatId[chatId];

          // Update messages to be marked as deleted
          await Message.updateMany(
            { _id: { $in: messageIds } },
            {
              $set: {
                deletedForEveryone: true,
                content: "This message disappeared",
                autoDeleteAt: null, // Clear the timer
              },
            },
          );

          // Notify both users in real-time
          io.to(chatId).emit("messages_auto_deleted", {
            chatId,
            messageIds: messageIds.map((id) => id.toString()),
          });

          console.log(
            `🗑️  Auto-deleted ${messageIds.length} message(s) in chat ${chatId}`,
          );
        }
      } catch (error) {
        if (!error.message.includes("buffering timed out")) {
          console.error("Auto-delete worker error:", error.message);
        }
      }
    }, 3000); // Check every 3 seconds
  };

  if (mongoose.connection.readyState === 1) {
    startInterval();
  } else {
    mongoose.connection.once("connected", startInterval);
  }
};

module.exports = startAutoDeleteWorker;
