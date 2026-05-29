import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HiOutlineDotsVertical, HiOutlineUserRemove } from "react-icons/hi";
import toast from "react-hot-toast";
import { friendAPI } from "../../services/api";
import { useSocket } from "../../hooks/useSocket";

const FriendList = ({
  friends,
  loading,
  onFriendSelect,
  activeFriendId,
  onFriendRemoved,
}) => {
  const [menuOpenId, setMenuOpenId] = useState(null);
  const { isUserOnline } = useSocket();

  const handleRemoveFriend = async (friendId, friendName) => {
    if (!window.confirm(`Remove ${friendName} from your friends?`)) return;

    try {
      await friendAPI.removeFriend(friendId);
      toast.success(`${friendName} removed from friends`);
      if (onFriendRemoved) onFriendRemoved();
      setMenuOpenId(null);
    } catch (err) {
      toast.error("Failed to remove friend");
    }
  };

  const formatLastSeen = (date) => {
    if (!date) return "a long time ago";

    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (seconds < 30) return "just now";
    if (seconds < 60) return `${seconds}s ago`;
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="space-y-2 p-2">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-3 rounded-xl animate-pulse"
          >
            <div className="w-12 h-12 rounded-full skeleton" />
            <div className="flex-1 space-y-2">
              <div className="h-4 skeleton rounded w-3/4" />
              <div className="h-3 skeleton rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (friends.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <div className="text-5xl mb-3 animate-float">👥</div>
        <p className="text-sm font-medium text-offwhite mb-1">No friends yet</p>
        <p className="text-xs text-gray-soft">
          Click the + button above to add friends
        </p>
      </div>
    );
  }

  return (
    <div className="px-2 py-1 space-y-1">
      <AnimatePresence>
        {friends.map((friend, index) => {
          const isOnline = friend.isOnline || isUserOnline(friend._id);
          const isActive = activeFriendId === friend._id;

          return (
            <motion.div
              key={friend._id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ delay: index * 0.03 }}
              className="relative"
            >
              <div
                onClick={() => onFriendSelect && onFriendSelect(friend)}
                className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 group ${
                  isActive
                    ? "bg-dark-100 border-l-2 border-accent"
                    : "hover:bg-dark-100/70"
                }`}
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <img
                    src={friend.avatar}
                    alt={friend.fullName}
                    className="w-12 h-12 rounded-full object-cover border border-dark-200"
                  />
                  <div
                    className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-dark ${
                      isOnline ? "bg-green-500" : "bg-gray-soft/60"
                    }`}
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-offwhite truncate">
                      {friend.fullName}
                    </p>
                  </div>
                  <p className="text-xs text-gray-soft truncate">
                    {isOnline ? (
                      <span className="text-green-400">● Online</span>
                    ) : (
                      `Last seen ${formatLastSeen(friend.lastSeen)}`
                    )}
                  </p>
                </div>

                {/* Menu button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpenId(
                      menuOpenId === friend._id ? null : friend._id,
                    );
                  }}
                  className="p-1.5 rounded-lg hover:bg-dark-200 text-gray-soft hover:text-offwhite opacity-0 group-hover:opacity-100 transition-all"
                >
                  <HiOutlineDotsVertical className="text-base" />
                </button>
              </div>

              {/* Dropdown menu */}
              <AnimatePresence>
                {menuOpenId === friend._id && (
                  <>
                    <div
                      onClick={() => setMenuOpenId(null)}
                      className="fixed inset-0 z-10"
                    />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -5 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -5 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-2 top-14 z-20 bg-dark-100 border border-dark-200 rounded-xl shadow-card-hover overflow-hidden min-w-[180px]"
                    >
                      <button
                        onClick={() =>
                          handleRemoveFriend(friend._id, friend.fullName)
                        }
                        className="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2 transition-colors"
                      >
                        <HiOutlineUserRemove className="text-base" />
                        Remove Friend
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default FriendList;
