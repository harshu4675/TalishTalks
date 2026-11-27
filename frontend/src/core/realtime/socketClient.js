/**
 * The Socket.IO client.
 *
 * A single socket instance is shared by the whole application. It owns
 * reconnection, the authentication handshake and the "rooms" a conversation
 * is subscribed to. Consumers subscribe to typed events through the
 * `RealtimeProvider` rather than touching the raw socket.
 */

import { io } from "socket.io-client";

import config from "../config.js";
import { readToken } from "../auth/session.js";

/** Reconnection backoff, in milliseconds. */
const RECONNECT_DELAYS = [500, 1000, 2000, 4000, 8000];

let socket = null;

/**
 * Create (or return) the shared socket instance.
 *
 * @param {object} [options]
 * @param {boolean} [options.forceNew] Always create a new socket.
 * @returns {import('socket.io-client').Socket}
 */
export const getSocket = ({ forceNew = false } = {}) => {
  if (socket && !forceNew) return socket;

  socket = io(config.socketOrigin, {
    path: "/socket.io",
    transports: ["websocket", "polling"],
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 8000,
    randomizationFactor: 0.4,
    timeout: 15000,
    auth: (callback) => {
      const current = readToken();
      if (current) callback({ token: current });
      else callback({});
    },
  });

  return socket;
};

/** Connect the shared socket, replacing any previous instance. */
export const connectSocket = () => {
  const instance = getSocket({ forceNew: true });
  if (!instance.connected) instance.connect();
  return instance;
};

/** Disconnect and destroy the shared socket. */
export const disconnectSocket = () => {
  if (!socket) return;
  socket.removeAllListeners();
  socket.disconnect();
  socket = null;
};

/** The current socket instance, if one exists. */
export const getActiveSocket = () => socket;

/**
 * Join a conversation room so its events are delivered to this tab.
 * @returns {Promise<boolean>} whether the server accepted the join.
 */
export const joinRoom = (chatId) =>
  new Promise((resolve) => {
    const instance = getSocket();
    if (!instance || !instance.connected) {
      resolve(false);
      return;
    }
    try {
      instance.emit("join_chat", chatId, (ack) => resolve(Boolean(ack?.success)));
    } catch {
      resolve(false);
    }
  });

/** Leave a conversation room. */
export const leaveRoom = (chatId) => {
  const instance = getSocket();
  if (!instance) return;
  try {
    instance.emit("leave_chat", chatId);
  } catch {
    /* the room is dropped with the socket anyway */
  }
};

export { RECONNECT_DELAYS };
export default getSocket;
