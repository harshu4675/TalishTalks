import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  useContext,
} from "react";
import { chatAPI } from "../services/api";
import { AuthContext } from "./AuthContext";
import { SocketContext } from "./SocketContext";

export const ChatContext = createContext(null);

export const ChatProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const socketContext = useContext(SocketContext);
  const socket = socketContext?.socket;

  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingChats, setLoadingChats] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});

  // Fetch all chats
  const fetchChats = useCallback(async () => {
    if (!user) return;
    setLoadingChats(true);
    try {
      const res = await chatAPI.getAll();
      setChats(res.data.chats || []);
    } catch (err) {
      console.error("Failed to fetch chats:", err);
    } finally {
      setLoadingChats(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchChats();
    } else {
      setChats([]);
      setActiveChat(null);
      setMessages([]);
    }
  }, [user, fetchChats]);

  const selectChat = useCallback(
    (chat) => {
      setActiveChat(chat);
      setMessages([]);
      if (socket && chat) {
        socket.emit("join_chat", chat._id);
      }
    },
    [socket],
  );

  const closeChat = useCallback(() => {
    if (socket && activeChat) {
      socket.emit("leave_chat", activeChat._id);
    }
    setActiveChat(null);
    setMessages([]);
  }, [socket, activeChat]);

  const addMessage = useCallback((message) => {
    setMessages((prev) => {
      if (prev.some((m) => m._id === message._id)) return prev;
      return [...prev, message];
    });
  }, []);

  const updateMessageStatus = useCallback((messageIds, status, seenAt) => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (messageIds.includes(msg._id) || messageIds === "all") {
          return { ...msg, status, seenAt: seenAt || msg.seenAt };
        }
        return msg;
      }),
    );
  }, []);

  // Remove deleted message COMPLETELY
  const markMessageDeleted = useCallback((messageId) => {
    setMessages((prev) => prev.filter((msg) => msg._id !== messageId));
  }, []);

  // Remove auto-disappeared messages COMPLETELY
  const markMessagesAutoDeleted = useCallback((messageIds) => {
    setMessages((prev) => prev.filter((msg) => !messageIds.includes(msg._id)));
  }, []);

  // Remove message (for "delete for me")
  const removeMessage = useCallback((messageId) => {
    setMessages((prev) => prev.filter((msg) => msg._id !== messageId));
  }, []);

  // Update last message in chats list
  const updateLastMessage = useCallback(
    (chatId, message) => {
      setChats((prev) => {
        const exists = prev.some((c) => c._id === chatId);
        if (!exists) {
          fetchChats();
          return prev;
        }
        return prev
          .map((chat) =>
            chat._id === chatId
              ? {
                  ...chat,
                  lastMessage: message,
                  updatedAt: new Date().toISOString(),
                }
              : chat,
          )
          .sort(
            (a, b) =>
              new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
          );
      });
    },
    [fetchChats],
  );

  const incrementUnread = useCallback((chatId) => {
    setChats((prev) =>
      prev.map((c) =>
        c._id === chatId ? { ...c, unreadCount: (c.unreadCount || 0) + 1 } : c,
      ),
    );
  }, []);

  const resetUnread = useCallback((chatId) => {
    setChats((prev) =>
      prev.map((c) => (c._id === chatId ? { ...c, unreadCount: 0 } : c)),
    );
  }, []);

  // ===== SOCKET LISTENERS =====
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = ({ chatId, message }) => {
      if (activeChat?._id === chatId) {
        addMessage(message);
      }
      updateLastMessage(chatId, message);
    };

    const handleMessageNotification = ({ chatId, message }) => {
      if (activeChat?._id !== chatId) {
        incrementUnread(chatId);
      }
    };

    const handleMessagesSeen = ({ chatId, seenBy, seenAt }) => {
      if (activeChat?._id === chatId) {
        setMessages((prev) =>
          prev.map((msg) => {
            const senderId =
              typeof msg.sender === "object" ? msg.sender._id : msg.sender;
            if (senderId !== seenBy && msg.status !== "seen") {
              return { ...msg, status: "seen", seenAt };
            }
            return msg;
          }),
        );
      }
    };

    const handleMessageDeleted = ({ chatId, messageId }) => {
      if (activeChat?._id === chatId) {
        markMessageDeleted(messageId);
      }
    };

    const handleMessagesAutoDeleted = ({ chatId, messageIds }) => {
      if (activeChat?._id === chatId) {
        markMessagesAutoDeleted(messageIds);
      }
    };

    const handleTypingStart = ({ chatId, userId }) => {
      setTypingUsers((prev) => ({ ...prev, [chatId]: userId }));
    };

    const handleTypingStop = ({ chatId, userId }) => {
      setTypingUsers((prev) => {
        const updated = { ...prev };
        if (updated[chatId] === userId) {
          delete updated[chatId];
        }
        return updated;
      });
    };

    const handleDisappearingChanged = ({ chatId, disappearingMessages }) => {
      setChats((prev) =>
        prev.map((c) =>
          c._id === chatId ? { ...c, disappearingMessages } : c,
        ),
      );
      if (activeChat?._id === chatId) {
        setActiveChat((prev) => ({ ...prev, disappearingMessages }));
      }
    };

    socket.on("new_message", handleNewMessage);
    socket.on("message_notification", handleMessageNotification);
    socket.on("messages_seen", handleMessagesSeen);
    socket.on("message_deleted", handleMessageDeleted);
    socket.on("messages_auto_deleted", handleMessagesAutoDeleted);
    socket.on("typing_start", handleTypingStart);
    socket.on("typing_stop", handleTypingStop);
    socket.on("disappearing_mode_changed", handleDisappearingChanged);

    return () => {
      socket.off("new_message", handleNewMessage);
      socket.off("message_notification", handleMessageNotification);
      socket.off("messages_seen", handleMessagesSeen);
      socket.off("message_deleted", handleMessageDeleted);
      socket.off("messages_auto_deleted", handleMessagesAutoDeleted);
      socket.off("typing_start", handleTypingStart);
      socket.off("typing_stop", handleTypingStop);
      socket.off("disappearing_mode_changed", handleDisappearingChanged);
    };
  }, [
    socket,
    activeChat,
    addMessage,
    updateLastMessage,
    incrementUnread,
    markMessageDeleted,
    markMessagesAutoDeleted,
  ]);

  const value = {
    chats,
    setChats,
    fetchChats,
    activeChat,
    setActiveChat,
    selectChat,
    closeChat,
    messages,
    setMessages,
    addMessage,
    updateMessageStatus,
    removeMessage,
    markMessageDeleted,
    markMessagesAutoDeleted,
    loadingChats,
    setLoadingChats,
    loadingMessages,
    setLoadingMessages,
    typingUsers,
    resetUnread,
    updateLastMessage,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export default ChatProvider;
