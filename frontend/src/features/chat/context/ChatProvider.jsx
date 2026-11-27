/**
 * Chat state management.
 *
 * This provider owns the conversation list and the message history for the
 * open conversation. It is the only place that talks to the chat/message
 * endpoints or reacts to the realtime events that describe them, so the
 * feature components stay declarative.
 */

import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";

import { chatApi, messageApi } from "../../../core/api/endpoints.js";
import { useAuth } from "../../../core/auth/useAuth.js";
import { useRealtime } from "../../../core/realtime/useRealtime.js";
import { getSocket, joinRoom, leaveRoom } from "../../../core/realtime/socketClient.js";
import { createClientId } from "../../../core/utils/id.js";
import { ChatContext } from "./chatContext.js";
import { useToast } from "../../../shared/components/useToast.js";

/* =============================================================== reducer === */

/**
 * @param {object} state
 * @param {object[]} state.chats The conversation list.
 * @param {Record<string, object>} state.threads Message history keyed by chat id.
 * @param {Record<string, string>} state.typing Chat id -> user id currently typing.
 * @param {boolean} state.loading Whether the conversation list is loading.
 * @param {string|null} state.error A list-level error message.
 */
const initialState = {
  chats: [],
  threads: {},
  typing: {},
  loading: true,
  error: null,
};

/** Replace a chat in the list, or insert it if it is new. */
const upsertChat = (chats, chat) => {
  const index = chats.findIndex((entry) => entry._id === chat._id);
  if (index === -1) return [...chats, chat];
  const next = chats.slice();
  next[index] = { ...next[index], ...chat };
  return next;
};

/** Insert or replace a message inside a thread, keeping chronological order. */
const upsertMessage = (thread, message) => {
  const items = thread?.items ?? [];
  const byId = items.findIndex((entry) => entry._id === message._id);
  const byClientId =
    byId === -1 && message.clientId
      ? items.findIndex((entry) => entry.clientId && entry.clientId === message.clientId)
      : -1;

  if (byId !== -1) {
    const next = items.slice();
    next[byId] = { ...next[byId], ...message };
    return { ...thread, items: next };
  }

  if (byClientId !== -1) {
    const next = items.slice();
    next[byClientId] = { ...next[byClientId], ...message, _id: message._id };
    return { ...thread, items: next };
  }

  const next = [...items, message].sort((a, b) => {
    const delta = new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
    if (delta !== 0) return delta;
    return String(a._id).localeCompare(String(b._id));
  });
  return { ...thread, items: next };
};

/** Remove a message from a thread. */
const removeMessage = (thread, messageId) => {
  const items = (thread?.items ?? []).filter((entry) => entry._id !== messageId);
  return { ...thread, items };
};

/** Remove several messages from a thread. */
const removeMessages = (thread, messageIds = []) => {
  const ids = new Set(messageIds.map(String));
  const items = (thread?.items ?? []).filter((entry) => !ids.has(String(entry._id)));
  return { ...thread, items };
};

function chatReducer(state, action) {
  switch (action.type) {
    case "chats/loading":
      return { ...state, loading: true, error: null };

    case "chats/loaded":
      return { ...state, chats: action.chats, loading: false, error: null };

    case "chats/error":
      return { ...state, loading: false, error: action.error };

    case "chats/upsert":
      return { ...state, chats: upsertChat(state.chats, action.chat) };

    case "chats/patch":
      return {
        ...state,
        chats: state.chats.map((chat) =>
          chat._id === action.chatId ? { ...chat, ...action.patch } : chat,
        ),
      };

    case "chats/remove":
      return { ...state, chats: state.chats.filter((chat) => chat._id !== action.chatId) };

    case "chat/summary": {
      const chat = state.chats.find((entry) => entry._id === action.chatId);
      if (!chat) return state;
      return {
        ...state,
        chats: state.chats.map((entry) =>
          entry._id === action.chatId
            ? {
                ...entry,
                lastMessage: action.lastMessage ?? entry.lastMessage,
                unreadCount: action.unreadCount ?? entry.unreadCount,
              }
            : entry,
        ),
      };
    }

    case "thread/loading": {
      const thread = state.threads[action.chatId] ?? { items: [], hasMore: true, status: "loading" };
      return {
        ...state,
        threads: { ...state.threads, [action.chatId]: { ...thread, status: "loading" } },
      };
    }

    case "thread/loaded": {
      const existing = state.threads[action.chatId]?.items ?? [];
      const merged = new Map();
      [...existing, ...action.messages].forEach((message) => merged.set(message._id, message));
      const items = [...merged.values()].sort((a, b) => {
        const delta = new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
        if (delta !== 0) return delta;
        return String(a._id).localeCompare(String(b._id));
      });
      return {
        ...state,
        threads: {
          ...state.threads,
          [action.chatId]: {
            items,
            hasMore: action.hasMore,
            page: action.page,
            status: "ready",
          },
        },
      };
    }

    case "thread/append": {
      const thread = state.threads[action.chatId] ?? { items: [], hasMore: false, status: "ready" };
      return {
        ...state,
        threads: { ...state.threads, [action.chatId]: upsertMessage(thread, action.message) },
      };
    }

    case "thread/update": {
      const thread = state.threads[action.chatId];
      if (!thread) return state;
      return {
        ...state,
        threads: { ...state.threads, [action.chatId]: upsertMessage(thread, action.message) },
      };
    }

    case "thread/remove":
      return {
        ...state,
        threads: {
          ...state.threads,
          [action.chatId]: removeMessage(state.threads[action.chatId], action.messageId),
        },
      };

    case "thread/map": {
      const thread = state.threads[action.chatId];
      if (!thread) return state;
      return {
        ...state,
        threads: {
          ...state.threads,
          [action.chatId]: { ...thread, items: thread.items.map(action.transform) },
        },
      };
    }

    case "thread/removeMany": {
      const thread = state.threads[action.chatId];
      if (!thread) return state;
      return {
        ...state,
        threads: {
          ...state.threads,
          [action.chatId]: removeMessages(thread, action.messageIds),
        },
      };
    }

    case "thread/clear": {
      const thread = state.threads[action.chatId];
      if (!thread) return state;
      return {
        ...state,
        threads: {
          ...state.threads,
          [action.chatId]: { ...thread, items: [], hasMore: false, status: "ready" },
        },
      };
    }

    case "thread/status": {
      const thread = state.threads[action.chatId] ?? { items: [], hasMore: false };
      return {
        ...state,
        threads: { ...state.threads, [action.chatId]: { ...thread, status: action.status } },
      };
    }

    case "typing/start": {
      if (state.typing[action.chatId] === action.userId) return state;
      return { ...state, typing: { ...state.typing, [action.chatId]: action.userId } };
    }

    case "typing/stop": {
      if (!state.typing[action.chatId]) return state;
      const typing = { ...state.typing };
      delete typing[action.chatId];
      return { ...state, typing };
    }

    default:
      return state;
  }
}

/* ============================================================== provider === */

/**
 * Provide the conversation list, message history and chat actions.
 */
export function ChatProvider({ children }) {
  const { user } = useAuth();
  const { subscribe, isOnline } = useRealtime();
  const toast = useToast();

  const [state, dispatch] = useReducer(chatReducer, initialState);
  const activeChatIdRef = useRef(null);
  const typingTimers = useRef(new Map());
  const chatsRef = useRef([]);

  const viewerId = user?._id;

  // Keep a ref of the conversation list so realtime handlers can read the
  // latest unread counts without re-subscribing on every change.
  useEffect(() => {
    chatsRef.current = state.chats;
  }, [state.chats]);

  /* ------------------------------------------------------ conversation list */
  const loadChats = useCallback(async () => {
    dispatch({ type: "chats/loading" });
    try {
      const data = await chatApi.list();
      dispatch({ type: "chats/loaded", chats: data.chats || [] });
    } catch (error) {
      dispatch({ type: "chats/error", error: error.message || "Unable to load conversations." });
    }
  }, []);

  useEffect(() => {
    if (!viewerId) return;
    loadChats();
  }, [viewerId, loadChats]);

  /* ----------------------------------------------------------- message load */
  const loadMessages = useCallback(
    async (chatId, { page = 1 } = {}) => {
      if (!chatId) return;
      dispatch({ type: "thread/loading", chatId });
      try {
        const data = await messageApi.history(chatId, { page, limit: 40 });
        dispatch({
          type: "thread/loaded",
          chatId,
          messages: data.messages || [],
          hasMore: Boolean(data.hasMore),
          page: data.page || page,
        });
      } catch (error) {
        dispatch({ type: "thread/status", chatId, status: "error" });
        if (page === 1) {
          toast.error("Could not load messages", error.message);
        }
      }
    },
    [toast],
  );

  /* --------------------------------------------------------- open a chat */
  const openChat = useCallback(
    async (chatId) => {
      if (!chatId) return;
      activeChatIdRef.current = chatId;
      await joinRoom(chatId);
      await loadMessages(chatId, { page: 1 });

      // Only ask the server to mark messages as read when there is something
      // unread - an unnecessary round trip on every conversation open.
      const chat = chatsRef.current.find((entry) => entry._id === chatId);
      if ((chat?.unreadCount ?? 0) > 0 || chat?.isMarkedUnread) {
        try {
          await messageApi.markSeen(chatId);
          dispatch({
            type: "chats/patch",
            chatId,
            patch: { unreadCount: 0, isMarkedUnread: false },
          });
        } catch {
          /* marking seen is best effort */
        }
      }
    },
    [loadMessages],
  );

  /** Close the active chat and leave its room. */
  const closeChat = useCallback(() => {
    const chatId = activeChatIdRef.current;
    if (chatId) leaveRoom(chatId);
    activeChatIdRef.current = null;
  }, []);

  /* ------------------------------------------------------------- send text */
  const sendMessage = useCallback(
    async (chatId, content, { replyTo = null } = {}) => {
      const trimmed = (content || "").trim();
      if (!trimmed || !chatId) return null;

      const clientId = createClientId();
      const optimistic = {
        _id: `pending-${clientId}`,
        clientId,
        chat: chatId,
        sender: { _id: viewerId, fullName: user?.fullName, username: user?.username, avatar: user?.avatar },
        content: trimmed,
        messageType: "text",
        status: "sending",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        replyTo: replyTo
          ? {
              _id: replyTo._id,
              content: replyTo.content,
              messageType: replyTo.messageType,
              sender: replyTo.sender,
            }
          : null,
        pending: true,
      };

      dispatch({ type: "thread/append", chatId, message: optimistic });

      try {
        const data = await messageApi.send({ chatId, content: trimmed, clientId, replyTo: replyTo?._id });
        const saved = { ...(data.data || optimistic), pending: false };
        dispatch({ type: "thread/update", chatId, message: saved });
        return saved;
      } catch (error) {
        dispatch({
          type: "thread/update",
          chatId,
          message: { ...optimistic, status: "failed", pending: false, error: error.message },
        });
        toast.error("Message not sent", error.message);
        throw error;
      }
    },
    [viewerId, user, toast],
  );

  /* ------------------------------------------------------------ send media */
  const sendMedia = useCallback(
    async (chatId, file, { replyTo = null } = {}) => {
      if (!file || !chatId) return null;
      const clientId = createClientId();
      const isVideo = file.type.startsWith("video/");
      const previewUrl = typeof URL !== "undefined" ? URL.createObjectURL(file) : "";

      const optimistic = {
        _id: `pending-${clientId}`,
        clientId,
        chat: chatId,
        sender: { _id: viewerId, fullName: user?.fullName, username: user?.username, avatar: user?.avatar },
        content: "",
        messageType: isVideo ? "video" : "image",
        media: { url: previewUrl, type: isVideo ? "video" : "image", size: file.size },
        status: "sending",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        pending: true,
        localPreview: true,
      };

      dispatch({ type: "thread/append", chatId, message: optimistic });

      try {
        const data = await messageApi.sendMedia({ chatId, file, clientId, replyTo: replyTo?._id });
        const saved = { ...(data.data || optimistic), pending: false };
        dispatch({ type: "thread/update", chatId, message: saved });
        return saved;
      } catch (error) {
        dispatch({
          type: "thread/update",
          chatId,
          message: { ...optimistic, status: "failed", pending: false, error: error.message },
        });
        toast.error("Media not sent", error.message);
        throw error;
      } finally {
        if (previewUrl && typeof URL !== "undefined") URL.revokeObjectURL(previewUrl);
      }
    },
    [viewerId, user, toast],
  );

  /* ------------------------------------------------------------ edit/delete */
  const editMessage = useCallback(
    async (chatId, messageId, content) => {
      const data = await messageApi.edit(messageId, content);
      const saved = data.data;
      if (saved) dispatch({ type: "thread/update", chatId, message: saved });
      return saved;
    },
    [],
  );

  const deleteMessage = useCallback(
    async (chatId, messageId, scope = "me") => {
      if (scope === "everyone") await messageApi.deleteForEveryone(messageId);
      else await messageApi.deleteForMe(messageId);
      dispatch({ type: "thread/remove", chatId, messageId });
    },
    [],
  );

  /* ------------------------------------------------------------ chat flags */
  const togglePin = useCallback(
    async (chatId) => {
      const data = await chatApi.pin(chatId);
      dispatch({ type: "chats/patch", chatId, patch: { isPinned: data.isPinned } });
      return data;
    },
    [],
  );

  const toggleMute = useCallback(
    async (chatId) => {
      const data = await chatApi.mute(chatId);
      dispatch({ type: "chats/patch", chatId, patch: { isMuted: data.isMuted } });
      return data;
    },
    [],
  );

  const toggleMarkUnread = useCallback(
    async (chatId) => {
      const data = await chatApi.markUnread(chatId);
      dispatch({ type: "chats/patch", chatId, patch: { isMarkedUnread: data.isMarkedUnread } });
      return data;
    },
    [],
  );

  const setDisappearing = useCallback(
    async (chatId, mode) => {
      const data = await chatApi.setDisappearing(chatId, mode);
      dispatch({
        type: "chats/patch",
        chatId,
        patch: { disappearingMessages: data.disappearingMessages },
      });
      return data;
    },
    [],
  );

  const clearChat = useCallback(
    async (chatId) => {
      await chatApi.clear(chatId);
      dispatch({ type: "thread/clear", chatId });
      dispatch({ type: "chats/patch", chatId, patch: { unreadCount: 0, isMarkedUnread: false } });
    },
    [],
  );

  const removeChat = useCallback(
    async (chatId) => {
      await chatApi.remove(chatId);
      dispatch({ type: "chats/remove", chatId });
      dispatch({ type: "thread/clear", chatId });
    },
    [],
  );

  /** Create (or reuse) the conversation with a friend. */
  const startChatWith = useCallback(
    async (friendId) => {
      const data = await chatApi.create(friendId);
      dispatch({ type: "chats/upsert", chat: data.chat });
      return data.chat;
    },
    [],
  );

  /* --------------------------------------------------------------- typing */
  const notifyTyping = useCallback((chatId, isTyping) => {
    const socket = getSocket();
    if (!socket || !socket.connected) return;
    try {
      socket.emit(isTyping ? "typing_start" : "typing_stop", { chatId });
    } catch {
      /* typing hints are best effort */
    }
  }, []);

  /* ---------------------------------------------------- realtime reactions */
  useEffect(() => {
    const unsubscribes = [];
    const timers = typingTimers.current;

    unsubscribes.push(
      subscribe("new_message", ({ chatId, message }) => {
        if (!chatId || !message) return;
        dispatch({ type: "thread/append", chatId, message });
        const isActive = activeChatIdRef.current === chatId;
        const fromSelf = String(message?.sender?._id || message?.sender) === String(viewerId);
        if (!isActive && !fromSelf) {
          const current = chatsRef.current.find((chat) => chat._id === chatId);
          dispatch({
            type: "chats/patch",
            chatId,
            patch: { unreadCount: (current?.unreadCount ?? 0) + 1 },
          });
        }
      }),
    );

    unsubscribes.push(
      subscribe("message_notification", ({ chatId }) => {
        if (!chatId) return;
        const isActive = activeChatIdRef.current === chatId;
        if (isActive) {
          messageApi.markSeen(chatId).catch(() => {});
        }
      }),
    );

    unsubscribes.push(
      subscribe("message_edited", ({ chatId, message }) => {
        if (chatId && message) dispatch({ type: "thread/update", chatId, message });
      }),
    );

    unsubscribes.push(
      subscribe("message_deleted", ({ chatId, messageId }) => {
        if (chatId && messageId) dispatch({ type: "thread/remove", chatId, messageId });
      }),
    );

    unsubscribes.push(
      subscribe("messages_deleted", ({ chatId, messageIds }) => {
        if (chatId && messageIds) dispatch({ type: "thread/removeMany", chatId, messageIds });
      }),
    );

    unsubscribes.push(
      subscribe("messages_auto_deleted", ({ chatId, messageIds }) => {
        if (chatId && messageIds) dispatch({ type: "thread/removeMany", chatId, messageIds });
      }),
    );

    unsubscribes.push(
      subscribe("messages_seen", ({ chatId, seenBy, seenAt }) => {
        if (!chatId) return;
        if (String(seenBy) === String(viewerId)) {
          dispatch({ type: "chats/patch", chatId, patch: { unreadCount: 0 } });
          return;
        }
        // The other participant read our messages - reflect the read receipts.
        dispatch({
          type: "thread/map",
          chatId,
          transform: (message) =>
            String(message?.sender?._id || message?.sender) === String(viewerId) &&
            message.status !== "seen"
              ? { ...message, status: "seen", seenAt: seenAt || new Date().toISOString() }
              : message,
        });
      }),
    );

    unsubscribes.push(
      subscribe("chat_summary", ({ chatId, lastMessage, unreadCount }) => {
        if (!chatId) return;
        dispatch({ type: "chat/summary", chatId, lastMessage, unreadCount });
      }),
    );

    unsubscribes.push(
      subscribe("chat_cleared", ({ chatId, hidden }) => {
        if (!chatId) return;
        dispatch({ type: "thread/clear", chatId });
        if (hidden) dispatch({ type: "chats/remove", chatId });
      }),
    );

    unsubscribes.push(
      subscribe("disappearing_mode_changed", ({ chatId, disappearingMessages }) => {
        if (!chatId) return;
        dispatch({ type: "chats/patch", chatId, patch: { disappearingMessages } });
      }),
    );

    unsubscribes.push(
      subscribe("typing_start", ({ chatId, userId }) => {
        if (!chatId || String(userId) === String(viewerId)) return;
        dispatch({ type: "typing/start", chatId, userId: String(userId) });
        const existing = typingTimers.current.get(chatId);
        if (existing) clearTimeout(existing);
        typingTimers.current.set(
          chatId,
          setTimeout(() => dispatch({ type: "typing/stop", chatId }), 6000),
        );
      }),
    );

    unsubscribes.push(
      subscribe("typing_stop", ({ chatId, userId }) => {
        if (!chatId || String(userId) === String(viewerId)) return;
        const timer = typingTimers.current.get(chatId);
        if (timer) clearTimeout(timer);
        typingTimers.current.delete(chatId);
        dispatch({ type: "typing/stop", chatId });
      }),
    );

    return () => {
      unsubscribes.forEach((unsubscribe) => unsubscribe());
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, [subscribe, viewerId]);

  /* -------------------------------------------------------- derived values */
  const sortedChats = useMemo(() => {
    const order = (a, b) => {
      if (Boolean(b.isPinned) !== Boolean(a.isPinned)) return Number(!!b.isPinned) - Number(!!a.isPinned);
      const aTime = new Date(a.lastMessage?.createdAt || a.updatedAt || 0).getTime();
      const bTime = new Date(b.lastMessage?.createdAt || b.updatedAt || 0).getTime();
      return bTime - aTime;
    };
    return [...state.chats].sort(order);
  }, [state.chats]);

  const totalUnread = useMemo(
    () => state.chats.reduce((total, chat) => total + (chat.unreadCount || 0), 0),
    [state.chats],
  );

  const value = useMemo(
    () => ({
      chats: sortedChats,
      threads: state.threads,
      typing: state.typing,
      loading: state.loading,
      error: state.error,
      totalUnread,
      isOnline,
      loadChats,
      loadMessages,
      openChat,
      closeChat,
      sendMessage,
      sendMedia,
      editMessage,
      deleteMessage,
      togglePin,
      toggleMute,
      toggleMarkUnread,
      setDisappearing,
      clearChat,
      removeChat,
      startChatWith,
      notifyTyping,
    }),
    [
      sortedChats,
      state.threads,
      state.typing,
      state.loading,
      state.error,
      totalUnread,
      isOnline,
      loadChats,
      loadMessages,
      openChat,
      closeChat,
      sendMessage,
      sendMedia,
      editMessage,
      deleteMessage,
      togglePin,
      toggleMute,
      toggleMarkUnread,
      setDisappearing,
      clearChat,
      removeChat,
      startChatWith,
      notifyTyping,
    ],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export { ChatContext };
export default ChatProvider;
