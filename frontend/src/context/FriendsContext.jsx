import React, { createContext, useState, useEffect, useCallback, useContext, useRef } from "react";
import { friendAPI } from "../services/api";
import { AuthContext } from "./AuthContext";
import { SocketContext } from "./SocketContext";
import toast from "react-hot-toast";
import { errorMessage } from "../utils/messages";
export const FriendsContext = createContext(null);
export const FriendsProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const { socket, isConnected } = useContext(SocketContext);
  const [friends, setFriends] = useState([]), [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [loadingFriends, setLoadingFriends] = useState(false), [friendsError, setFriendsError] = useState("");
  const requests = useRef({ friends: null, pending: null });
  const userId = user?._id;
  const fetchFriends = useCallback(async () => {
    if (!userId) return;
    requests.current.friends?.abort();
    const controller = new AbortController(); requests.current.friends = controller; setLoadingFriends(true);
    try { const response = await friendAPI.getList({ signal: controller.signal }); if (!controller.signal.aborted) { setFriends(response.data.friends || []); setFriendsError(""); } }
    catch (error) { if (!controller.signal.aborted) setFriendsError(errorMessage(error, "Could not load friends.")); }
    finally { if (requests.current.friends === controller) requests.current.friends = null; if (!controller.signal.aborted) setLoadingFriends(false); }
  }, [userId]);
  const removeFriendById = useCallback((id) => setFriends((previous) => previous.filter((friend) => friend._id !== id)), []);
  const fetchPendingCount = useCallback(async () => {
    if (!userId) return;
    requests.current.pending?.abort();
    const controller = new AbortController(); requests.current.pending = controller;
    try { const response = await friendAPI.getRequests({ signal: controller.signal }); if (!controller.signal.aborted) setPendingRequestsCount(response.data.receivedCount || 0); }
    catch (error) { if (!controller.signal.aborted) setFriendsError(errorMessage(error, "Could not load friend requests.")); }
    finally { if (requests.current.pending === controller) requests.current.pending = null; }
  }, [userId]);
  useEffect(() => {
    if (userId) { void fetchFriends(); void fetchPendingCount(); }
    else { setFriends([]); setPendingRequestsCount(0); setFriendsError(""); }
    const pending = requests.current;
    return () => Object.values(pending).forEach((controller) => controller?.abort());
  }, [userId, fetchFriends, fetchPendingCount]);
  useEffect(() => {
    if (!socket || !userId) return;
    const received = (data) => { toast(`${data.sender.fullName} sent you a friend request`); void fetchPendingCount(); };
    const accepted = (data) => { toast.success(data.message || "Friend request accepted"); void fetchFriends(); void fetchPendingCount(); };
    const refresh = () => { void fetchFriends(); void fetchPendingCount(); };
    const handlers = { friend_request_received: received, friend_request_accepted: accepted, friend_request_cancelled: refresh, friend_removed: refresh, user_blocked_you: refresh, user_unblocked_you: refresh, connect: refresh };
    Object.entries(handlers).forEach(([name, handler]) => socket.on(name, handler));
    return () => Object.entries(handlers).forEach(([name, handler]) => socket.off(name, handler));
  }, [socket, isConnected, userId, fetchFriends, fetchPendingCount]);
  return <FriendsContext.Provider value={{ friends, loadingFriends, friendsError, pendingRequestsCount, fetchFriends, fetchPendingCount, removeFriendById }}>{children}</FriendsContext.Provider>;
};
export default FriendsProvider;
