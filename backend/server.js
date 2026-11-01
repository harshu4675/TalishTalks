require("dotenv").config();
const mongoose = require("mongoose");
const { validateEnv } = require("./config/env");
const connectDB = require("./config/db");
const createApp = require("./app");
const startAutoDeleteWorker = require("./socket/autoDeleteWorker");
const dropTTLIndex = require("./utils/dropTTLIndex");

const startServer = async () => {
  try {
    validateEnv();
    await connectDB();
    await dropTTLIndex();
    const { server, io } = createApp();
    const stopWorker = startAutoDeleteWorker(io);
    const port = Number(process.env.PORT || 5000);
    server.listen(port, "0.0.0.0", () => console.log(`Talish Talks API listening on port ${port}`));
    server.on("error", (error) => {
      console.error("Server failed:", error.message);
      process.exitCode = 1;
      stopWorker();
      io.close();
    });
    const shutdown = () => {
      stopWorker();
      io.close();
      server.close(async () => {
        await mongoose.disconnect();
        process.exit(0);
      });
    };
    process.once("SIGTERM", shutdown);
    process.once("SIGINT", shutdown);
  } catch (error) {
    console.error("Startup failed:", error.message);
    process.exitCode = 1;
  }
};

startServer();
