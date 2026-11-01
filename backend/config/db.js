const mongoose = require("mongoose");

const connectDB = async () => {
  mongoose.connection.on("disconnected", () => console.log("MongoDB disconnected"));
  mongoose.connection.on("error", (error) => console.error("MongoDB error:", error.message));
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  console.log("MongoDB connected");
};

module.exports = connectDB;
