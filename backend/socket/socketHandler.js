const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Initialize Socket.IO handlers
const initializeSocket = (io) => {
  // Middleware to authenticate socket connections
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error("Authentication error: No token provided"));
      }

      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select("-password");

      if (!user) {
        return next(new Error("Authentication error: User not found"));
      }

      // Attach user to socket
      socket.user = user;
      next();
    } catch (error) {
      next(new Error("Authentication error: Invalid token"));
    }
  });

  // Handle socket connections
  io.on("connection", async (socket) => {
    const userId = socket.user._id.toString();

    console.log(`🟢 User connected: ${socket.user.username} (${userId})`);

    // Update user's online status and socket ID
    await User.findByIdAndUpdate(userId, {
      isOnline: true,
      socketId: socket.id,
      lastSeen: new Date(),
    });

    // Join user to their personal room (for targeted messages)
    socket.join(userId);

    // Broadcast online status to all connected users
    io.emit("user_online", {
      userId: userId,
      isOnline: true,
    });

    // ---- TYPING INDICATOR ----
    socket.on("typing_start", (data) => {
      // data = { chatId, receiverId }
      socket.to(data.receiverId).emit("typing_start", {
        chatId: data.chatId,
        userId: userId,
      });
    });

    socket.on("typing_stop", (data) => {
      socket.to(data.receiverId).emit("typing_stop", {
        chatId: data.chatId,
        userId: userId,
      });
    });

    // ---- JOIN CHAT ROOM ----
    socket.on("join_chat", (chatId) => {
      socket.join(chatId);
      console.log(`📨 ${socket.user.username} joined chat: ${chatId}`);
    });

    // ---- LEAVE CHAT ROOM ----
    socket.on("leave_chat", (chatId) => {
      socket.leave(chatId);
      console.log(`📤 ${socket.user.username} left chat: ${chatId}`);
    });

    // ---- HANDLE DISCONNECT ----
    socket.on("disconnect", async () => {
      console.log(`🔴 User disconnected: ${socket.user.username} (${userId})`);

      // Update user's offline status
      await User.findByIdAndUpdate(userId, {
        isOnline: false,
        socketId: "",
        lastSeen: new Date(),
      });

      // Broadcast offline status
      io.emit("user_offline", {
        userId: userId,
        isOnline: false,
        lastSeen: new Date(),
      });
    });
  });

  return io;
};

module.exports = initializeSocket;
