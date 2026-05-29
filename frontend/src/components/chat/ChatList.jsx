import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSocket } from "../../hooks/useSocket";
import { useAuth } from "../../hooks/useAuth";

const ChatList = ({ chats, loading, activeChatId, onChatSelect }) => {
  const { isUserOnline } = useSocket();
  const { user } = useAuth();

  const formatTime = (date) => {
    if (!date) return "";
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "now";
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return d.toLocaleDateString();
  };

  const truncate = (text, len = 30) => {
    if (!text) return "";
    return text.length > len ? text.slice(0, len) + "..." : text;
  };

  if (loading) {
    return (
      <div className="space-y-1 p-2">
        {[1, 2, 3].map((i) => (
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

  if (chats.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <div className="text-5xl mb-3 animate-float">💭</div>
        <p className="text-sm font-medium text-offwhite mb-1">No chats yet</p>
        <p className="text-xs text-gray-soft">
          Select a friend to start chatting
        </p>
      </div>
    );
  }

  return (
    <div className="px-2 py-1 space-y-0.5">
      <AnimatePresence>
        {chats.map((chat, index) => {
          const otherUser = chat.otherUser;
          const isOnline = isUserOnline(otherUser._id);
          const isActive = activeChatId === chat._id;
          const lastMsg = chat.lastMessage;
          const isOwnLast =
            lastMsg &&
            (typeof lastMsg.sender === "object"
              ? lastMsg.sender._id === user._id
              : lastMsg.sender === user._id);

          return (
            <motion.div
              key={chat._id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ delay: index * 0.03 }}
              onClick={() => onChatSelect(chat)}
              className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                isActive
                  ? "bg-dark-100 border-l-2 border-accent"
                  : "hover:bg-dark-100/70"
              }`}
            >
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <img
                  src={otherUser.avatar}
                  alt={otherUser.fullName}
                  className="w-12 h-12 rounded-full object-cover border border-dark-200"
                />
                {isOnline && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-dark" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <p className="text-sm font-semibold text-offwhite truncate">
                    {otherUser.fullName}
                  </p>
                  <span className="text-[10px] text-gray-soft flex-shrink-0 ml-2">
                    {formatTime(lastMsg?.createdAt || chat.updatedAt)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p
                    className="text-xs truncate"
                    style={{ color: "var(--color-textMuted)" }}
                  >
                    {lastMsg && !lastMsg.deletedForEveryone ? (
                      <>
                        {isOwnLast && (
                          <span style={{ color: "var(--color-primary)" }}>
                            You:{" "}
                          </span>
                        )}
                        {truncate(lastMsg.content)}
                      </>
                    ) : (
                      <span className="italic">No messages yet</span>
                    )}
                  </p>
                  {chat.unreadCount > 0 && !isActive && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="flex-shrink-0 bg-accent text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1.5"
                    >
                      {chat.unreadCount > 9 ? "9+" : chat.unreadCount}
                    </motion.span>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default ChatList;
