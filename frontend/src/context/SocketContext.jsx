import React, { createContext, useState, useEffect, useCallback } from "react";
import { io } from "socket.io-client";
import { useAuth } from "../hooks/useAuth";
import notificationService from "/..services/notificationServices.js";

// Create Socket Context
export const SocketContext = createContext(null);
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

// Socket Provider Component
export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const { user } = useAuth();

  // Request notification permission once user is logged in
  useEffect(() => {
    if (user) {
      notificationService.requestPermission();
    }
  }, [user]);

  // Connect to socket when user logs in
  useEffect(() => {
    if (user) {
      const token = localStorage.getItem("talish_token");
      if (!token) return;

      const newSocket = io(SOCKET_URL, {
        auth: { token },
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      newSocket.on("connect", () => {
        console.log("🟢 Socket connected:", newSocket.id);
        setIsConnected(true);
      });

      newSocket.on("disconnect", (reason) => {
        console.log("🔴 Socket disconnected:", reason);
        setIsConnected(false);
      });

      newSocket.on("connect_error", (error) => {
        console.error("❌ Socket connection error:", error.message);
        setIsConnected(false);
      });

      newSocket.on("user_online", (data) => {
        setOnlineUsers((prev) =>
          prev.includes(data.userId) ? prev : [...prev, data.userId],
        );
      });

      newSocket.on("user_offline", (data) => {
        setOnlineUsers((prev) => prev.filter((id) => id !== data.userId));
      });

      // ===== REAL-TIME NOTIFICATIONS =====

      // New message notification (when tab hidden)
      newSocket.on("new_message", (data) => {
        const message = data.message || data;
        const senderId =
          typeof message.sender === "object"
            ? message.sender._id
            : message.sender;

        // Don't notify for own messages
        if (senderId === user._id || senderId === user.id) return;

        const senderName =
          message.sender?.fullName || data.senderName || "New message";
        const content = message.content || "Sent you a message";
        const chatId = message.chat || data.chatId;

        notificationService.showMessage(senderName, content, chatId, () => {
          window.location.href = `/chat/${chatId}`;
        });
      });

      // Friend request received
      newSocket.on("friend_request_received", (data) => {
        const senderName =
          data.sender?.fullName || data.senderName || "Someone";
        notificationService.showFriendRequest(senderName);
      });

      // Friend request accepted
      newSocket.on("friend_request_accepted", (data) => {
        const name = data.user?.fullName || data.name || "Someone";
        notificationService.showFriendAccepted(name);
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
        setSocket(null);
        setIsConnected(false);
      };
    } else {
      if (socket) {
        socket.close();
        setSocket(null);
        setIsConnected(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const isUserOnline = useCallback(
    (userId) => onlineUsers.includes(userId),
    [onlineUsers],
  );

  const emitTypingStart = useCallback(
    (chatId, receiverId) => {
      if (socket) socket.emit("typing_start", { chatId, receiverId });
    },
    [socket],
  );

  const emitTypingStop = useCallback(
    (chatId, receiverId) => {
      if (socket) socket.emit("typing_stop", { chatId, receiverId });
    },
    [socket],
  );

  const joinChat = useCallback(
    (chatId) => {
      if (socket) socket.emit("join_chat", chatId);
    },
    [socket],
  );

  const leaveChat = useCallback(
    (chatId) => {
      if (socket) socket.emit("leave_chat", chatId);
    },
    [socket],
  );

  const value = {
    socket,
    isConnected,
    onlineUsers,
    isUserOnline,
    emitTypingStart,
    emitTypingStop,
    joinChat,
    leaveChat,
  };

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
};

export default SocketProvider;
