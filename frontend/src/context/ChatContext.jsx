import React, { createContext, useState, useEffect, useCallback, useContext, useRef } from "react";
import toast from "react-hot-toast";
import { chatAPI, messageAPI } from "../services/api";
import { AuthContext } from "./AuthContext";
import { SocketContext } from "./SocketContext";
import { mergeMessages, sortChats, senderId, errorMessage } from "../utils/messages";

export const ChatContext = createContext(null);
const newClientId = () => globalThis.crypto?.randomUUID?.() || `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const ChatProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const userId = user?._id;
  const { socket, isConnected } = useContext(SocketContext) || {};
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingChats, setLoadingChats] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [chatError, setChatError] = useState("");
  const [typingUsers, setTypingUsers] = useState({});
  const [unlockedChats, setUnlockedChats] = useState(new Set());
  const [showLockedSection, setShowLockedSection] = useState(false);
  const activeRef = useRef(null);
  const messagesRef = useRef([]);
  const loadingRef = useRef(false);
  const requestRef = useRef(null);
  const removedRef = useRef(new Set());
  const bufferRef = useRef([]);
  const chatRequestRef = useRef(null);
  const chatsRef = useRef([]);
  const seenRequests = useRef(new Set());
  const readingLatest = useRef(true);
  const typingTimers = useRef(new Map());
  const pendingMedia = useRef(new Map());
  const outbox = useRef(new Map());

  const commitMessages = useCallback((next) => { messagesRef.current = next; setMessages(next); }, []);
  const commitChats = useCallback((next) => { chatsRef.current = next; setChats(next); }, []);

  const fetchChats = useCallback(async () => {
    if (!userId) return;
    chatRequestRef.current?.abort();
    const controller = new AbortController();
    chatRequestRef.current = controller;
    setLoadingChats(true);
    try {
      const response = await chatAPI.getAll({ signal: controller.signal });
      if (!controller.signal.aborted) { commitChats(sortChats(response.data.chats || [])); setChatError(""); return response.data.chats || []; }
    } catch (error) {
      if (error.code !== "ERR_CANCELED" && !controller.signal.aborted) setChatError(errorMessage(error, "Could not load chats."));
    } finally { if (!controller.signal.aborted) setLoadingChats(false); }
  }, [userId, commitChats]);

  const updateChatFlags = useCallback((chatId, flags) => {
    commitChats(sortChats(chatsRef.current.map((chat) => chat._id === chatId ? { ...chat, ...flags } : chat)));
    setActiveChat((previous) => previous?._id === chatId ? { ...previous, ...flags } : previous);
    if (activeRef.current?._id === chatId) activeRef.current = { ...activeRef.current, ...flags };
  }, [commitChats]);

  const markSeen = useCallback(async (chatId) => {
    if (!chatId || !readingLatest.current || document.visibilityState !== "visible" || seenRequests.current.has(chatId)) return;
    const unread = messagesRef.current.some((message) => senderId(message) !== user?._id && message.status !== "seen" && !message.isOptimistic);
    if (!unread) return;
    seenRequests.current.add(chatId);
    try {
      await messageAPI.markSeen(chatId);
      if (activeRef.current?._id === chatId) updateChatFlags(chatId, { unreadCount: 0, isMarkedUnread: false });
    } catch { /* A later focus/reconnect will retry; never claim a failed read receipt. */ }
    finally { seenRequests.current.delete(chatId); }
  }, [user?._id, updateChatFlags]);

  const loadMessages = useCallback(async (chatId, older = false) => {
    if (!chatId || (older && loadingRef.current)) return;
    if (!older) {
      requestRef.current?.abort();
      removedRef.current.clear();
      bufferRef.current = [];
      commitMessages([]);
      setHistoryError("");
      setHasMore(false);
    }
    const controller = new AbortController();
    requestRef.current = controller;
    loadingRef.current = true;
    if (older) setLoadingOlder(true); else setLoadingMessages(true);
    try {
      const cursor = older ? messagesRef.current.find((message) => !message.isOptimistic)?._id : null;
      const response = await messageAPI.get(chatId, { limit: 50, ...(cursor ? { before: cursor } : { page: 1 }) }, { signal: controller.signal });
      if (activeRef.current?._id !== chatId || controller.signal.aborted) return;
      const incoming = response.data.messages || [];
      const pending = [...outbox.current.values()].filter((message) => message.chat === chatId && !removedRef.current.has(message._id));
      commitMessages(mergeMessages(older ? [...incoming, ...messagesRef.current] : [...pending, ...incoming, ...bufferRef.current], [], removedRef.current));
      bufferRef.current = [];
      setHasMore(!!response.data.hasMore);
      setHistoryError("");
      void markSeen(chatId);
      return true;
    } catch (error) {
      if (error.code !== "ERR_CANCELED" && activeRef.current?._id === chatId) setHistoryError(errorMessage(error, "Could not load messages."));
      return false;
    } finally {
      if (activeRef.current?._id === chatId && !controller.signal.aborted) {
        loadingRef.current = false; setLoadingMessages(false); setLoadingOlder(false);
      }
    }
  }, [commitMessages, markSeen]);

  const selectChat = useCallback((chat) => {
    if (!chat) return;
    if (activeRef.current?._id === chat._id) {
      activeRef.current = { ...activeRef.current, ...chat };
      setActiveChat(activeRef.current);
      return;
    }
    const previousId = activeRef.current?._id;
    if (previousId) {
      socket?.emit("leave_chat", previousId);
      if (chatsRef.current.find((item) => item._id === previousId)?.disappearingMessages?.enabled) {
        messageAPI.leaveCleanup(previousId).catch(() => {});
      }
    }
    readingLatest.current = true;
    activeRef.current = chat;
    setActiveChat(chat);
    setTypingUsers({});
    socket?.emit("join_chat", chat._id);
    void loadMessages(chat._id);
  }, [socket, loadMessages]);

  const closeChat = useCallback(() => {
    const previous = activeRef.current;
    requestRef.current?.abort();
    activeRef.current = null;
    loadingRef.current = false;
    setActiveChat(null);
    commitMessages([]);
    setLoadingMessages(false);
    setLoadingOlder(false);
    setHistoryError("");
    if (previous) {
      socket?.emit("leave_chat", previous._id);
      if (chatsRef.current.find((item) => item._id === previous._id)?.disappearingMessages?.enabled) messageAPI.leaveCleanup(previous._id).catch(() => {});
    }
  }, [socket, commitMessages]);

  const setReadingLatest = useCallback((value) => { readingLatest.current = value; }, []);

  const addMessage = useCallback((message) => {
    if (message.isOptimistic) outbox.current.set(message.clientId, message);
    const chatId = message.chat?.toString() || message.chatId;
    if (activeRef.current?._id !== chatId) return;
    if (loadingRef.current && !message.isOptimistic) { bufferRef.current.push(message); return; }
    commitMessages(mergeMessages(messagesRef.current, message, removedRef.current));
    if (!message.isOptimistic) void markSeen(chatId);
  }, [commitMessages, markSeen]);

  const confirmMessage = useCallback((chatId, clientId, message) => {
    const pending = pendingMedia.current.get(clientId);
    if (pending) { URL.revokeObjectURL(pending.url); pendingMedia.current.delete(clientId); }
    outbox.current.delete(clientId);
    if (activeRef.current?._id !== chatId) return;
    commitMessages(mergeMessages(messagesRef.current.filter((item) => item._id !== clientId), { ...message, clientId }, removedRef.current));
  }, [commitMessages]);

  const failMessage = useCallback((chatId, clientId) => {
    const outgoing = outbox.current.get(clientId);
    if (outgoing) outbox.current.set(clientId, { ...outgoing, failed: true, status: "failed" });
    if (activeRef.current?._id === chatId) commitMessages(messagesRef.current.map((message) => message._id === clientId ? { ...message, failed: true, status: "failed" } : message));
  }, [commitMessages]);

  const sendMessage = useCallback(async (chatId, content, replyTo) => {
    const clientId = newClientId();
    const optimistic = { _id: clientId, clientId, chat: chatId, sender: user, content, messageType: "text", replyTo, status: "sending", isOptimistic: true, createdAt: new Date().toISOString() };
    addMessage(optimistic);
    try {
      const response = await messageAPI.send({ chatId, content, replyTo: replyTo?._id || null, clientId });
      confirmMessage(chatId, clientId, response.data.data);
      return true;
    } catch (error) { failMessage(chatId, clientId); toast.error(errorMessage(error, "Message not sent. Retry below.")); return false; }
  }, [user, addMessage, confirmMessage, failMessage]);

  const retryMessage = useCallback(async (clientId) => {
    const message = messagesRef.current.find((item) => item._id === clientId);
    if (!message?.failed) return;
    commitMessages(messagesRef.current.map((item) => item._id === clientId ? { ...item, failed: false, status: "sending" } : item));
    try {
      const payload = { chatId: message.chat, content: message.content, replyTo: message.replyTo?._id || null, clientId: message.clientId };
      const response = await messageAPI.send(payload);
      confirmMessage(message.chat, clientId, response.data.data);
    } catch (error) { failMessage(message.chat, clientId); toast.error(errorMessage(error)); }
  }, [commitMessages, confirmMessage, failMessage]);

  const discardMessage = useCallback((clientId) => {
    const pending = pendingMedia.current.get(clientId);
    if (pending) { URL.revokeObjectURL(pending.url); pendingMedia.current.delete(clientId); }
    outbox.current.delete(clientId);
    commitMessages(messagesRef.current.filter((message) => message._id !== clientId));
  }, [commitMessages]);

  const uploadMedia = useCallback(async (chatId, file, replyTo, clientId, url, onProgress) => {
    const form = new FormData();
    form.append("chatId", chatId); form.append("clientId", clientId); form.append("media", file);
    if (replyTo?._id) form.append("replyTo", replyTo._id);
    try {
      const response = await messageAPI.sendMedia(form, (progress) => {
        const pending = outbox.current.get(clientId);
        if (pending) outbox.current.set(clientId, { ...pending, uploadProgress: progress });
        if (activeRef.current?._id === chatId) commitMessages(messagesRef.current.map((message) => message._id === clientId ? { ...message, uploadProgress: progress } : message));
        onProgress?.(progress);
      }, { timeout: 120000 });
      confirmMessage(chatId, clientId, response.data.data);
      return true;
    } catch (error) { failMessage(chatId, clientId); toast.error(errorMessage(error, "Media not sent. Retry below.")); return false; }
  }, [commitMessages, confirmMessage, failMessage]);
  const sendMedia = useCallback(async (chatId, file, replyTo, onProgress) => {
    const clientId = newClientId();
    const url = URL.createObjectURL(file);
    pendingMedia.current.set(clientId, { file, url, chatId, replyTo });
    const messageType = file.type.startsWith("video/") ? "video" : "image";
    addMessage({ _id: clientId, clientId, chat: chatId, sender: user, content: "", messageType, media: { url, type: messageType }, replyTo, status: "sending", isOptimistic: true, createdAt: new Date().toISOString() });
    return uploadMedia(chatId, file, replyTo, clientId, url, onProgress);
  }, [user, addMessage, uploadMedia]);

  const retryMedia = useCallback(async (clientId) => {
    const pending = pendingMedia.current.get(clientId);
    const message = messagesRef.current.find((item) => item._id === clientId);
    if (!pending || !message?.failed) return;
    commitMessages(messagesRef.current.map((item) => item._id === clientId ? { ...item, failed: false, status: "sending" } : item));
    return uploadMedia(pending.chatId, pending.file, pending.replyTo, clientId, pending.url);
  }, [commitMessages, uploadMedia]);

  const removeMessages = useCallback((chatId, ids) => {
    ids.forEach((id) => removedRef.current.add(id));
    if (activeRef.current?._id === chatId) commitMessages(messagesRef.current.filter((message) => !ids.includes(message._id)));
  }, [commitMessages]);

  const deleteMessages = useCallback(async (ids, everyone = false) => {
    const chatId = activeRef.current?._id;
    if (!chatId || !ids.length) return false;
    try {
      const response = ids.length === 1
        ? await messageAPI[everyone ? "deleteForEveryone" : "deleteForMe"](ids[0])
        : await messageAPI[everyone ? "bulkDeleteForEveryone" : "bulkDeleteForMe"](ids);
      const confirmed = response.data.deletedIds || [response.data.messageId || ids[0]];
      removeMessages(chatId, confirmed);
      toast.success(everyone ? "Deleted for everyone" : "Deleted for you");
      return true;
    } catch (error) {
      if (error.response?.status === 404) { removeMessages(chatId, ids); return true; }
      toast.error(errorMessage(error, "Could not delete messages.")); return false;
    }
  }, [removeMessages]);

  const updateMessage = useCallback((id, updated) => {
    if (updated.chat === activeRef.current?._id) commitMessages(mergeMessages(messagesRef.current, updated, removedRef.current));
  }, [commitMessages]);
  const editMessage = useCallback(async (id, content) => {
    try { const response = await messageAPI.edit(id, content); updateMessage(id, response.data.data); return true; }
    catch (error) { toast.error(errorMessage(error, "Could not edit message.")); return false; }
  }, [updateMessage]);
  const removeChatFromList = useCallback((chatId) => {
    commitChats(chatsRef.current.filter((chat) => chat._id !== chatId));
    if (activeRef.current?._id === chatId) closeChat();
  }, [commitChats, closeChat]);
  const resetUnread = useCallback((chatId) => updateChatFlags(chatId, { unreadCount: 0, isMarkedUnread: false }), [updateChatFlags]);
  const markChatsUnlocked = useCallback(() => setUnlockedChats(new Set(chatsRef.current.filter((chat) => chat.isLocked).map((chat) => chat._id))), []);
  const lockAllAgain = useCallback(() => {
    setUnlockedChats(new Set()); setShowLockedSection(false);
    if (activeRef.current?.isLocked) closeChat();
  }, [closeChat]);

  useEffect(() => {
    if (!userId) { closeChat(); commitChats([]); setUnlockedChats(new Set()); outbox.current.clear(); pendingMedia.current.forEach((entry) => URL.revokeObjectURL(entry.url)); pendingMedia.current.clear(); }
    else void fetchChats();
  }, [userId, fetchChats, closeChat, commitChats]);
  useEffect(() => {
    const pending = pendingMedia.current;
    const outgoing = outbox.current;
    return () => { chatRequestRef.current?.abort(); requestRef.current?.abort(); pending.forEach((entry) => URL.revokeObjectURL(entry.url)); pending.clear(); outgoing.clear(); };
  }, []);

  useEffect(() => {
    if (!socket || !userId) return;
    const summary = ({ chatId, ...flags }) => {
      if (!chatsRef.current.some((chat) => chat._id === chatId)) { void fetchChats(); return; }
      updateChatFlags(chatId, flags);
    };
    const receive = ({ chatId, message }) => {
      addMessage({ ...message, chatId });
      if (!chatsRef.current.some((chat) => chat._id === chatId)) void fetchChats();
    };
    const deleted = (data) => removeMessages(data.chatId, data.messageIds || [data.messageId]);
    const edited = ({ messageId, message }) => updateMessage(messageId, message);
    const seen = ({ chatId, seenBy, seenAt }) => {
      if (activeRef.current?._id === chatId) commitMessages(messagesRef.current.map((message) => senderId(message) !== seenBy && !message.isOptimistic ? { ...message, status: "seen", seenAt } : message));
    };
    const cleared = ({ chatId, hidden }) => {
      if (hidden) removeChatFromList(chatId);
      else {
        updateChatFlags(chatId, { lastMessage: null, unreadCount: 0, isMarkedUnread: false });
        if (activeRef.current?._id === chatId) void loadMessages(chatId);
      }
    };
    const typing = ({ chatId, userId }, active) => {
      const key = `${chatId}:${userId}`;
      clearTimeout(typingTimers.current.get(key));
      if (active) {
        setTypingUsers((previous) => ({ ...previous, [chatId]: userId }));
        typingTimers.current.set(key, setTimeout(() => setTypingUsers((previous) => { const next = { ...previous }; delete next[chatId]; return next; }), 4000));
      } else setTypingUsers((previous) => { const next = { ...previous }; delete next[chatId]; return next; });
    };
    const start = (data) => typing(data, true), stop = (data) => typing(data, false);
    const disappearing = ({ chatId, disappearingMessages }) => updateChatFlags(chatId, { disappearingMessages });
    const reconnect = () => {
      void fetchChats();
      if (activeRef.current) { socket.emit("join_chat", activeRef.current._id); void loadMessages(activeRef.current._id); }
    };
    const timers = typingTimers.current;
    const focus = () => { if (document.visibilityState === "visible") { void fetchChats(); if (activeRef.current) void markSeen(activeRef.current._id); } };
    const handlers = { new_message: receive, chat_summary: summary, message_deleted: deleted, messages_deleted: deleted, messages_auto_deleted: deleted, message_edited: edited, messages_seen: seen, chat_cleared: cleared, typing_start: start, typing_stop: stop, disappearing_mode_changed: disappearing, user_blocked_you: fetchChats, user_unblocked_you: fetchChats, connect: reconnect };
    Object.entries(handlers).forEach(([event, handler]) => socket.on(event, handler));
    if (isConnected && activeRef.current) socket.emit("join_chat", activeRef.current._id);
    document.addEventListener("visibilitychange", focus);
    return () => {
      Object.entries(handlers).forEach(([event, handler]) => socket.off(event, handler));
      document.removeEventListener("visibilitychange", focus);
      timers.forEach(clearTimeout); timers.clear();
    };
  }, [socket, isConnected, userId, addMessage, closeChat, removeMessages, updateMessage, commitMessages, fetchChats, updateChatFlags, removeChatFromList, loadMessages, markSeen]);

  useEffect(() => {
    if (socket) socket.mutedChats = new Set(chats.filter((chat) => chat.isMuted).map((chat) => chat._id));
  }, [socket, chats]);

  const value = {
    chats, setChats, fetchChats, activeChat, setActiveChat, selectChat, closeChat,
    messages, setMessages, addMessage, setReadingLatest, updateMessage, removeMessages, deleteMessages, editMessage,
    sendMessage, sendMedia, retryMessage, retryMedia, discardMessage, loadMessages, markSeen,
    loadingChats, loadingMessages, loadingOlder, hasMore, historyError, chatError, typingUsers,
    resetUnread, updateChatFlags, removeChatFromList, unlockedChats, setUnlockedChats,
    showLockedSection, setShowLockedSection, markChatsUnlocked, lockAllAgain,
  };
  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};
export default ChatProvider;
