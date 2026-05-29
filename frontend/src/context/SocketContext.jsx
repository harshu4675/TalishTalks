import React, { createContext, useState, useEffect, useCallback } from "react";
import { io } from "socket.io-client";
import { useAuth } from "../hooks/useAuth";

// Create Socket Context
export const SocketContext = createContext(null);
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

// Socket Provider Component
export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const { user } = useAuth();

  // Connect to socket when user logs in
  useEffect(() => {
    if (user) {
      const token = localStorage.getItem("talish_token");

      if (!token) return;

      // Create socket connection
      const newSocket = io(SOCKET_URL, {
        auth: { token },
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      // Connection events
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

      // Online status events
      newSocket.on("user_online", (data) => {
        setOnlineUsers((prev) => {
          if (!prev.includes(data.userId)) {
            return [...prev, data.userId];
          }
          return prev;
        });
      });

      newSocket.on("user_offline", (data) => {
        setOnlineUsers((prev) => prev.filter((id) => id !== data.userId));
      });

      setSocket(newSocket);

      // Cleanup on unmount or user change
      return () => {
        newSocket.close();
        setSocket(null);
        setIsConnected(false);
      };
    } else {
      // No user, disconnect socket
      if (socket) {
        socket.close();
        setSocket(null);
        setIsConnected(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Check if a specific user is online
  const isUserOnline = useCallback(
    (userId) => {
      return onlineUsers.includes(userId);
    },
    [onlineUsers],
  );

  // Emit typing start
  const emitTypingStart = useCallback(
    (chatId, receiverId) => {
      if (socket) {
        socket.emit("typing_start", { chatId, receiverId });
      }
    },
    [socket],
  );

  // Emit typing stop
  const emitTypingStop = useCallback(
    (chatId, receiverId) => {
      if (socket) {
        socket.emit("typing_stop", { chatId, receiverId });
      }
    },
    [socket],
  );

  // Join a chat room
  const joinChat = useCallback(
    (chatId) => {
      if (socket) {
        socket.emit("join_chat", chatId);
      }
    },
    [socket],
  );

  // Leave a chat room
  const leaveChat = useCallback(
    (chatId) => {
      if (socket) {
        socket.emit("leave_chat", chatId);
      }
    },
    [socket],
  );

  // Context value
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
