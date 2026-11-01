import React, { createContext, useState, useEffect, useCallback, useMemo } from "react";
import { io } from "socket.io-client";
import { useAuth } from "../hooks/useAuth";
import notificationService from "../services/notificationService";

export const SocketContext = createContext(null);
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin;

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem("talish_token");
    if (!user?._id || !token) return;
    const connection = io(SOCKET_URL, {
      auth: { token }, transports: ["websocket", "polling"],
      reconnection: true, reconnectionDelay: 1000, reconnectionDelayMax: 10000,
      timeout: 15000,
    });
    connection.on("connect", () => setIsConnected(true));
    connection.on("disconnect", () => { setIsConnected(false); setOnlineUsers([]); });
    connection.on("connect_error", () => setIsConnected(false));
    connection.on("online_users", ({ userIds }) => setOnlineUsers(userIds || []));
    connection.on("user_online", ({ userId }) => setOnlineUsers((previous) => [...new Set([...previous, userId])]));
    connection.on("user_offline", ({ userId }) => setOnlineUsers((previous) => previous.filter((id) => id !== userId)));
    connection.on("new_message", ({ chatId, message }) => {
      const sender = message.sender?._id || message.sender;
      if (sender !== user._id && !connection.mutedChats?.has(chatId)) {
        notificationService.showMessage(message.sender?.fullName || "New message", message.content || (message.messageType === "video" ? "Sent a video" : "Sent a photo"), chatId);
      }
    });
    connection.on("friend_request_received", (data) => notificationService.showFriendRequest(data.sender?.fullName || "Someone"));
    connection.on("friend_request_accepted", (data) => notificationService.showFriendAccepted(data.friend?.fullName || "Someone"));
    setSocket(connection);
    return () => { connection.removeAllListeners(); connection.disconnect(); setSocket(null); setIsConnected(false); setOnlineUsers([]); };
  }, [user?._id]);

  const isUserOnline = useCallback((id) => onlineUsers.includes(id), [onlineUsers]);
  const emitTypingStart = useCallback((chatId) => socket?.emit("typing_start", { chatId }), [socket]);
  const emitTypingStop = useCallback((chatId) => socket?.emit("typing_stop", { chatId }), [socket]);
  const joinChat = useCallback((chatId) => socket?.emit("join_chat", chatId), [socket]);
  const leaveChat = useCallback((chatId) => socket?.emit("leave_chat", chatId), [socket]);
  const value = useMemo(() => ({ socket, isConnected, onlineUsers, isUserOnline, emitTypingStart, emitTypingStop, joinChat, leaveChat }),
    [socket, isConnected, onlineUsers, isUserOnline, emitTypingStart, emitTypingStop, joinChat, leaveChat]);
  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};
export default SocketProvider;
