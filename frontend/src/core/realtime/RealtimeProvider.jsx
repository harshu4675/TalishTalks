/**
 * The realtime provider.
 *
 * Exposes a small, stable surface for the rest of the application:
 * connection status, presence information, typing notifications and a
 * generic `subscribe(event, handler)` escape hatch for new features.
 */

import { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "../auth/useAuth.js";
import { connectSocket, disconnectSocket, getSocket } from "./socketClient.js";

const RealtimeContext = createContext(null);

/** Connection lifecycle exposed to the UI. */
export const CONNECTION_STATE = Object.freeze({
  IDLE: "idle",
  CONNECTING: "connecting",
  CONNECTED: "connected",
  RECONNECTING: "reconnecting",
  OFFLINE: "offline",
});

/**
 * Provide realtime capabilities to the application.
 */
export function RealtimeProvider({ children }) {
  const { isAuthenticated, user } = useAuth();

  const [connectionState, setConnectionState] = useState(CONNECTION_STATE.IDLE);
  const [onlineUserIds, setOnlineUserIds] = useState(() => new Set());
  const [lastError, setLastError] = useState(null);

  const socketRef = useRef(null);
  const handlersRef = useRef(new Map());

  /* ------------------------------------------------------ subscription API */
  const subscribe = useCallback((event, handler) => {
    if (!handlersRef.current.has(event)) handlersRef.current.set(event, new Set());
    handlersRef.current.get(event).add(handler);
    return () => {
      handlersRef.current.get(event)?.delete(handler);
    };
  }, []);

  /** Dispatch an event to every registered handler. */
  const emitLocal = useCallback((event, payload) => {
    handlersRef.current.get(event)?.forEach((handler) => {
      try {
        handler(payload);
      } catch (error) {
        console.error(`Realtime handler for "${event}" failed:`, error);
      }
    });
  }, []);

  /* ------------------------------------------------------- connection life */
  useEffect(() => {
    if (!isAuthenticated) {
      disconnectSocket();
      socketRef.current = null;
      setConnectionState(CONNECTION_STATE.IDLE);
      setOnlineUserIds(new Set());
      return undefined;
    }

    const socket = connectSocket();
    socketRef.current = socket;
    setConnectionState(CONNECTION_STATE.CONNECTING);

    const handleConnect = () => {
      setConnectionState(CONNECTION_STATE.CONNECTED);
      setLastError(null);
      emitLocal("connection:connected", { connectedAt: Date.now() });
    };

    const handleDisconnect = (reason) => {
      setConnectionState(
        reason === "io client disconnect" ? CONNECTION_STATE.IDLE : CONNECTION_STATE.RECONNECTING,
      );
      emitLocal("connection:disconnected", { reason });
    };

    const handleConnectError = (error) => {
      setLastError(error?.message || "Realtime connection failed");
      setConnectionState(CONNECTION_STATE.OFFLINE);
      emitLocal("connection:error", error);
    };

    const handleReconnectAttempt = () => setConnectionState(CONNECTION_STATE.RECONNECTING);

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);
    socket.io.on("reconnect_attempt", handleReconnectAttempt);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
      socket.io.off("reconnect_attempt", handleReconnectAttempt);
      disconnectSocket();
      socketRef.current = null;
    };
  }, [isAuthenticated, emitLocal]);

  /* --------------------------------------------------- presence + fan-out */
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !isAuthenticated) return undefined;

    const handleOnlineUsers = ({ userIds }) => {
      setOnlineUserIds(new Set((userIds || []).map(String)));
    };

    const handleUserOnline = ({ userId, isOnline }) => {
      setOnlineUserIds((current) => {
        const next = new Set(current);
        if (isOnline) next.add(String(userId));
        else next.delete(String(userId));
        return next;
      });
      emitLocal("presence:changed", { userId: String(userId), isOnline: Boolean(isOnline) });
    };

    const handleUserOffline = ({ userId, isOnline, lastSeen }) => {
      setOnlineUserIds((current) => {
        const next = new Set(current);
        next.delete(String(userId));
        return next;
      });
      emitLocal("presence:changed", {
        userId: String(userId),
        isOnline: Boolean(isOnline),
        lastSeen: lastSeen || null,
      });
    };

    socket.on("online_users", handleOnlineUsers);
    socket.on("user_online", handleUserOnline);
    socket.on("user_offline", handleUserOffline);

    return () => {
      socket.off("online_users", handleOnlineUsers);
      socket.off("user_online", handleUserOnline);
      socket.off("user_offline", handleUserOffline);
    };
  }, [isAuthenticated, emitLocal]);

  /* ------------------------------------------- server event fan-out ------- */
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !isAuthenticated) return undefined;

    /**
     * Events the server pushes to a user room. They are re-emitted through the
     * local `subscribe` bus so feature code never touches the socket directly.
     */
    const serverEvents = [
      "new_message",
      "message_notification",
      "message_edited",
      "message_deleted",
      "messages_deleted",
      "messages_auto_deleted",
      "messages_seen",
      "chat_summary",
      "chat_cleared",
      "disappearing_mode_changed",
      "friend_request_received",
      "friend_request_accepted",
      "friend_request_rejected",
      "friend_request_cancelled",
      "friend_removed",
      "user_blocked_you",
      "user_unblocked_you",
      "typing_start",
      "typing_stop",
    ];

    const listeners = serverEvents.map((event) => {
      const handler = (payload) => emitLocal(event, payload);
      socket.on(event, handler);
      return [event, handler];
    });

    return () => {
      listeners.forEach(([event, handler]) => socket.off(event, handler));
    };
  }, [isAuthenticated, emitLocal]);

  /* ------------------------------------------------------------- presence */
  const isOnline = useCallback(
    (userId) => {
      if (!userId) return false;
      if (String(userId) === String(user?._id)) return true;
      return onlineUserIds.has(String(userId));
    },
    [onlineUserIds, user],
  );

  const value = useMemo(
    () => ({
      connectionState,
      isConnected: connectionState === CONNECTION_STATE.CONNECTED,
      isRealtimeAvailable: connectionState === CONNECTION_STATE.CONNECTED,
      onlineUserIds,
      isOnline,
      lastError,
      subscribe,
      socket: socketRef.current,
    }),
    [connectionState, onlineUserIds, isOnline, lastError, subscribe],
  );

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export { RealtimeContext, getSocket };
export default RealtimeProvider;
