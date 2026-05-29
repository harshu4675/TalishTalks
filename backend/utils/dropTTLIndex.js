const mongoose = require("mongoose");

const dropTTLIndex = async () => {
  try {
    const Message = mongoose.connection.collection("messages");
    const indexes = await Message.indexes();

    for (const index of indexes) {
      // Find the old TTL index on autoDeleteAt
      if (index.expireAfterSeconds !== undefined && index.key?.autoDeleteAt) {
        await Message.dropIndex(index.name);
        console.log(`✅ Dropped old TTL index: ${index.name}`);
      }
    }
  } catch (error) {
    // Silently ignore if index doesn't exist
    if (!error.message.includes("index not found")) {
      console.log("TTL index cleanup:", error.message);
    }
  }
};

module.exports = dropTTLIndex;
