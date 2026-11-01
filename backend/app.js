const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const mongoSanitize = require("express-mongo-sanitize");
const compression = require("compression");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");
const initializeSocket = require("./socket/socketHandler");

const createApp = () => {
  const app = express();
  const server = http.createServer(app);
  const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:3000").split(",").map((origin) => origin.trim());
  const corsOptions = {
    origin(origin, callback) { callback(null, !origin || allowedOrigins.includes(origin)); },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  };
  const io = new Server(server, { cors: corsOptions, pingTimeout: 60000, pingInterval: 25000, maxHttpBufferSize: 1e6 });
  app.set("io", io);
  app.set("allowedOrigins", allowedOrigins);
  app.set("trust proxy", 1);
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(cors(corsOptions));
  app.use(compression());
  app.use(express.json({ limit: "100kb" }));
  app.use(express.urlencoded({ extended: false, limit: "100kb" }));
  app.use(cookieParser());
  app.use(mongoSanitize());
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: process.env.NODE_ENV === "test" ? 10000 : 600,
    standardHeaders: true, legacyHeaders: false,
    message: { success: false, message: "Too many requests. Please try again later." },
  });
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: process.env.NODE_ENV === "test" ? 1000 : 20,
    skipSuccessfulRequests: true,
    standardHeaders: true, legacyHeaders: false,
    message: { success: false, message: "Too many auth attempts. Please try again in 15 minutes." },
  });
  app.use("/api", limiter);
  app.get("/api/health", (_req, res) => res.json({ success: true, message: "Talish Talks API is running" }));
  app.use("/api/auth", (req, res, next) => ["login", "register"].includes(req.path.slice(1)) ? authLimiter(req, res, next) : next(), require("./routes/authRoutes"));
  app.use("/api/users", require("./routes/userRoutes"));
  app.use("/api/friends", require("./routes/friendRoutes"));
  app.use("/api/chats", require("./routes/chatRoutes"));
  app.use("/api/messages", require("./routes/messageRoutes"));
  app.use("/api/push", require("./routes/pushRoutes"));
  app.use(notFound);
  app.use(errorHandler);
  initializeSocket(io);
  return { app, server, io };
};

module.exports = createApp;
