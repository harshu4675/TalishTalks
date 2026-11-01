const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Chat = require("../models/Chat");
const { isParticipant, validId } = require("../utils/messageUtils");

const initializeSocket = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (typeof token !== "string") return next(new Error("Authentication required"));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select("fullName username friends");
      if (!user) return next(new Error("Authentication required"));
      socket.user = user;
      socket.tokenExpiresAt = decoded.exp * 1000;
      next();
    } catch {
      next(new Error("Authentication expired or invalid"));
    }
  });

  io.on("connection", async (socket) => {
    const userId = socket.user._id.toString();
    const audience = [...new Set([userId, ...socket.user.friends.map(String)])];
    try {
      await socket.join(userId);
      const expiry = socket.tokenExpiresAt - Date.now();
      if (expiry <= 0) return socket.disconnect(true);
      const expiryTimer = setTimeout(() => socket.disconnect(true), Math.min(expiry, 2147483647));
      expiryTimer.unref();
      const otherTabs = (io.sockets.adapter.rooms.get(userId)?.size || 1) > 1;
      if (!otherTabs) {
        await User.updateOne({ _id: userId }, { $set: { isOnline: true, socketId: socket.id } });
        socket.to(audience).emit("user_online", { userId, isOnline: true });
      }
      const onlineUsers = audience.filter((id) => io.sockets.adapter.rooms.get(id)?.size);
      socket.emit("online_users", { userIds: onlineUsers });

      const typing = async (data, event) => {
        if (!validId(data?.chatId)) return;
        const chat = await Chat.findById(data.chatId).select("participants");
        if (!isParticipant(chat, userId)) return;
        const recipients = chat.participants.map(String).filter((id) => id !== userId);
        io.to(recipients).emit(event, { chatId: data.chatId, userId });
      };
      socket.on("typing_start", (data) => typing(data, "typing_start").catch(() => {}));
      socket.on("typing_stop", (data) => typing(data, "typing_stop").catch(() => {}));
      socket.on("join_chat", async (chatId, acknowledge) => {
        if (!validId(chatId)) return acknowledge?.({ success: false });
        try {
          const chat = await Chat.findById(chatId).select("participants");
          if (!isParticipant(chat, userId)) return acknowledge?.({ success: false });
          await socket.join(chatId);
          acknowledge?.({ success: true });
        } catch { acknowledge?.({ success: false }); }
      });
      socket.on("leave_chat", (chatId) => {
        if (typeof chatId === "string") socket.leave(chatId);
      });
      socket.on("disconnect", async () => {
        clearTimeout(expiryTimer);
        try {
          if (io.sockets.adapter.rooms.get(userId)?.size) return;
          const lastSeen = new Date();
          await User.updateOne({ _id: userId }, { $set: { isOnline: false, socketId: "", lastSeen } });
          io.to(audience).emit("user_offline", { userId, isOnline: false, lastSeen });
        } catch (error) {
          console.error("Presence update failed:", error.message);
        }
      });
    } catch (error) {
      console.error("Socket setup failed:", error.message);
      socket.disconnect(true);
    }
  });
  return io;
};

module.exports = initializeSocket;
