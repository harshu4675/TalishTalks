require("dotenv").config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const compression = require("compression");
const mongoose = require("mongoose");

const connectDB = require("./config/db");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");
const initializeSocket = require("./socket/socketHandler");
const startAutoDeleteWorker = require("./socket/autoDeleteWorker");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const friendRoutes = require("./routes/friendRoutes");
const chatRoutes = require("./routes/chatRoutes");
const messageRoutes = require("./routes/messageRoutes");
const pushRoutes = require("./routes/pushRoutes");

const app = express();
const server = http.createServer(app);

app.set("trust proxy", 1);

const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:3000")
  .split(",")
  .map((url) => url.trim().replace(/\/$/, ""));

console.log("✅ Allowed CORS origins:", allowedOrigins);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    const cleanOrigin = origin.replace(/\/$/, "");

    if (allowedOrigins.includes(cleanOrigin)) {
      return callback(null, true);
    }

    console.warn(`❌ CORS blocked: ${origin}`);
    return callback(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

const io = new Server(server, {
  cors: corsOptions,
  pingTimeout: 60000,
  pingInterval: 25000,
});
app.set("io", io);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

app.use(cors(corsOptions));

app.use(compression());

app.use(mongoSanitize());
app.use(xss());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: {
    success: false,
    message: "Too many requests from this IP. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    message: "Too many auth attempts. Please try again in 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

app.use("/api", limiter);

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Talish Talks API is running!",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/friends", friendRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/push", pushRoutes);

app.use(notFound);
app.use(errorHandler);

// ---- INITIALIZE SOCKET.IO ----
initializeSocket(io);

// ---- DROP OLD TTL INDEX ----
const dropTTLIndex = require("./utils/dropTTLIndex");
mongoose.connection.once("connected", async () => {
  await dropTTLIndex();
});

// ---- START AUTO-DELETE WORKER ----
startAutoDeleteWorker(io);

// ---- HANDLE EXCEPTIONS ----
process.on("uncaughtException", (err) => {
  console.error("💥 Uncaught Exception:", err.message);
  process.exit(1);
});

process.on("unhandledRejection", (err) => {
  console.error("💥 Unhandled Rejection:", err.message);
  server.close(() => process.exit(1));
});

// ---- START SERVER ----
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();

    server.listen(PORT, () => {
      console.log("TALISH TALKS SERVER RUNNING");
      console.log(`Port: ${PORT}`);
      console.log(`Env: ${process.env.NODE_ENV || "development"}`);
      console.log("Socket.IO: Active");
      console.log("Security: Enabled");
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();
