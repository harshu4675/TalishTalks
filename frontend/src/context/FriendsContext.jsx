import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  useContext,
} from "react";
import { friendAPI } from "../services/api";
import { AuthContext } from "./AuthContext";
import { SocketContext } from "./SocketContext";
import toast from "react-hot-toast";

export const FriendsContext = createContext(null);

export const FriendsProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const socketContext = useContext(SocketContext);
  const socket = socketContext?.socket;

  const [friends, setFriends] = useState([]);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [loadingFriends, setLoadingFriends] = useState(false);

  const fetchFriends = useCallback(async () => {
    if (!user) return;
    setLoadingFriends(true);
    try {
      const res = await friendAPI.getList();
      setFriends(res.data.friends || []);
    } catch (err) {
      console.error("Failed to fetch friends:", err);
    } finally {
      setLoadingFriends(false);
    }
  }, [user]);

  const fetchPendingCount = useCallback(async () => {
    if (!user) return;
    try {
      const res = await friendAPI.getRequests();
      setPendingRequestsCount(res.data.receivedCount || 0);
    } catch (err) {
      console.error("Failed to fetch pending count:", err);
    }
  }, [user]);

  // 🔥 NEW: Remove a friend from list instantly (used after block)
  const removeFriendById = useCallback((friendId) => {
    setFriends((prev) => prev.filter((f) => f._id !== friendId));
  }, []);

  useEffect(() => {
    if (user) {
      fetchFriends();
      fetchPendingCount();
    } else {
      setFriends([]);
      setPendingRequestsCount(0);
    }
  }, [user, fetchFriends, fetchPendingCount]);

  useEffect(() => {
    if (!socket) return;

    const handleNewRequest = (data) => {
      toast(`${data.sender.fullName} sent you a friend request 👋`, {
        icon: "🤝",
        duration: 5000,
      });
      setPendingRequestsCount((prev) => prev + 1);
    };

    const handleRequestAccepted = (data) => {
      toast.success(data.message || "Friend request accepted! 🎉");
      fetchFriends();
    };

    const handleRequestCancelled = () => {
      fetchPendingCount();
    };

    const handleFriendRemoved = () => {
      fetchFriends();
    };

    socket.on("friend_request_received", handleNewRequest);
    socket.on("friend_request_accepted", handleRequestAccepted);
    socket.on("friend_request_cancelled", handleRequestCancelled);
    socket.on("friend_removed", handleFriendRemoved);

    return () => {
      socket.off("friend_request_received", handleNewRequest);
      socket.off("friend_request_accepted", handleRequestAccepted);
      socket.off("friend_request_cancelled", handleRequestCancelled);
      socket.off("friend_removed", handleFriendRemoved);
    };
  }, [socket, fetchFriends, fetchPendingCount]);

  useEffect(() => {
    if (!socket) return;

    const handleUserOnline = (data) => {
      setFriends((prev) =>
        prev.map((f) => (f._id === data.userId ? { ...f, isOnline: true } : f)),
      );
    };

    const handleUserOffline = (data) => {
      setFriends((prev) =>
        prev.map((f) =>
          f._id === data.userId
            ? { ...f, isOnline: false, lastSeen: data.lastSeen }
            : f,
        ),
      );
    };

    socket.on("user_online", handleUserOnline);
    socket.on("user_offline", handleUserOffline);

    return () => {
      socket.off("user_online", handleUserOnline);
      socket.off("user_offline", handleUserOffline);
    };
  }, [socket]);

  const value = {
    friends,
    setFriends,
    loadingFriends,
    pendingRequestsCount,
    setPendingRequestsCount,
    fetchFriends,
    fetchPendingCount,
    removeFriendById, // 🔥 NEW
  };

  return (
    <FriendsContext.Provider value={value}>{children}</FriendsContext.Provider>
  );
};

export default FriendsProvider;
