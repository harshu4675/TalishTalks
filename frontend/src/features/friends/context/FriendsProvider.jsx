/**
 * Friends state management.
 *
 * Owns the friend list, the incoming and outgoing friend requests, and the
 * user directory search. Realtime friend events are folded into the same
 * state so the UI never has to poll.
 */

import { useCallback, useEffect, useMemo, useState } from "react";

import { friendApi, userApi } from "../../../core/api/endpoints.js";
import { useAuth } from "../../../core/auth/useAuth.js";
import { useRealtime } from "../../../core/realtime/useRealtime.js";
import { useToast } from "../../../shared/components/useToast.js";
import { FriendsContext } from "./friendsContext.js";

/** Provide friends and directory state to the application. */
export function FriendsProvider({ children }) {
  const { user } = useAuth();
  const { subscribe } = useRealtime();
  const toast = useToast();

  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState({ received: [], sent: [] });
  const [directory, setDirectory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState(null);

  const viewerId = user?._id;

  /* ------------------------------------------------------------------ load */
  const refresh = useCallback(async () => {
    if (!viewerId) return;
    setIsLoading(true);
    try {
      const [friendList, requestList] = await Promise.all([
        friendApi.list(),
        friendApi.requests(),
      ]);
      setFriends(friendList.friends || []);
      setRequests({ received: requestList.received || [], sent: requestList.sent || [] });
      setError(null);
    } catch (caught) {
      setError(caught.message || "Unable to load your contacts.");
    } finally {
      setIsLoading(false);
    }
  }, [viewerId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  /* --------------------------------------------------------------- actions */
  const sendRequest = useCallback(
    async (username) => {
      const data = await friendApi.sendRequest(username);
      toast.success("Request sent", data.message);
      await refresh();
      return data;
    },
    [refresh, toast],
  );

  const respondToRequest = useCallback(
    async (requestId, accept) => {
      const data = await friendApi.respond(requestId, accept ? "accept" : "reject");
      toast.success(accept ? "Friend added" : "Request declined", data.message);
      await refresh();
      return data;
    },
    [refresh, toast],
  );

  const cancelRequest = useCallback(
    async (requestId) => {
      const data = await friendApi.cancelRequest(requestId);
      toast.info("Request cancelled", data.message);
      await refresh();
      return data;
    },
    [refresh, toast],
  );

  const removeFriend = useCallback(
    async (friendId) => {
      const data = await friendApi.removeFriend(friendId);
      toast.info("Friend removed", data.message);
      await refresh();
      return data;
    },
    [refresh, toast],
  );

  /* --------------------------------------------------------------- search */
  const searchUsers = useCallback(async (query) => {
    const trimmed = (query || "").trim();
    if (trimmed.length < 2) {
      setDirectory([]);
      return [];
    }
    setIsSearching(true);
    try {
      const data = await userApi.search(trimmed);
      setDirectory(data.users || []);
      return data.users || [];
    } catch (caught) {
      setDirectory([]);
      toast.error("Search failed", caught.message);
      return [];
    } finally {
      setIsSearching(false);
    }
  }, [toast]);

  /* ------------------------------------------------------------- realtime */
  useEffect(() => {
    const unsubscribes = [];

    unsubscribes.push(
      subscribe("friend_request_received", ({ sender, message }) => {
        toast.info("New friend request", message || `${sender?.fullName} wants to connect.`);
        refresh();
      }),
    );

    unsubscribes.push(
      subscribe("friend_request_accepted", ({ friend, message }) => {
        toast.success("Request accepted", message || `You are now friends with ${friend?.fullName}.`);
        refresh();
      }),
    );

    unsubscribes.push(
      subscribe("friend_request_rejected", () => {
        refresh();
      }),
    );

    unsubscribes.push(
      subscribe("friend_request_cancelled", () => {
        refresh();
      }),
    );

    unsubscribes.push(
      subscribe("friend_removed", ({ userId }) => {
        setFriends((current) => current.filter((friend) => String(friend._id) !== String(userId)));
      }),
    );

    unsubscribes.push(
      subscribe("user_blocked_you", () => {
        refresh();
      }),
    );

    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  }, [subscribe, refresh, toast]);

  /* -------------------------------------------------------------- derived */
  const friendIds = useMemo(
    () => new Set(friends.map((friend) => String(friend._id))),
    [friends],
  );

  const pendingReceivedIds = useMemo(
    () => new Set(requests.received.map((request) => String(request._id))),
    [requests.received],
  );

  const pendingSentReceiverIds = useMemo(
    () => new Set(requests.sent.map((request) => String(request.receiver?._id))),
    [requests.sent],
  );

  /** The relationship between the viewer and a directory result. */
  const relationshipWith = useCallback(
    (targetId) => {
      const id = String(targetId);
      if (friendIds.has(id)) return "friend";
      if (pendingReceivedIds.has(id)) return "incoming";
      if (pendingSentReceiverIds.has(id)) return "outgoing";
      return "none";
    },
    [friendIds, pendingReceivedIds, pendingSentReceiverIds],
  );

  const pendingCount = requests.received.length;

  const value = useMemo(
    () => ({
      friends,
      requests,
      directory,
      isLoading,
      isSearching,
      error,
      pendingCount,
      refresh,
      sendRequest,
      respondToRequest,
      cancelRequest,
      removeFriend,
      searchUsers,
      relationshipWith,
    }),
    [
      friends,
      requests,
      directory,
      isLoading,
      isSearching,
      error,
      pendingCount,
      refresh,
      sendRequest,
      respondToRequest,
      cancelRequest,
      removeFriend,
      searchUsers,
      relationshipWith,
    ],
  );

  return <FriendsContext.Provider value={value}>{children}</FriendsContext.Provider>;
}

export { FriendsContext };
export default FriendsProvider;
