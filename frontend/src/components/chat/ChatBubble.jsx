import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HiOutlineDotsVertical, HiOutlineTrash, HiCheck } from "react-icons/hi";
import { HiCheckBadge } from "react-icons/hi2";

const ChatBubble = ({
  message,
  isOwn,
  isLastSeen,
  onDeleteForMe,
  onDeleteForEveryone,
}) => {
  const [showMenu, setShowMenu] = useState(false);

  // ⚠️ Don't render deleted/disappeared messages at all
  if (message.deletedForEveryone) {
    return null;
  }

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  // Status icon for own messages
  const StatusIcon = () => {
    if (!isOwn) return null;

    if (message.status === "seen") {
      return (
        <div className="flex items-center gap-0.5" title="Seen">
          <HiCheck className="text-blue-400 text-sm -mr-2" />
          <HiCheck className="text-blue-400 text-sm" />
        </div>
      );
    }
    if (message.status === "delivered") {
      return (
        <div className="flex items-center gap-0.5" title="Delivered">
          <HiCheck className="text-white/70 text-sm -mr-2" />
          <HiCheck className="text-white/70 text-sm" />
        </div>
      );
    }
    return <HiCheck className="text-white/60 text-sm" title="Sent" />;
  };

  return (
    <div className="flex flex-col">
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className={`flex ${isOwn ? "justify-end" : "justify-start"} group px-1`}
      >
        <div
          className={`flex items-end gap-2 max-w-[75%] ${
            isOwn ? "flex-row-reverse" : "flex-row"
          }`}
        >
          {/* Message content */}
          <div className="relative">
            <div
              className="px-4 py-2.5 rounded-2xl shadow-sm transition-all"
              style={{
                background: isOwn
                  ? `linear-gradient(135deg, var(--color-primary) 0%, var(--color-primaryDark) 100%)`
                  : "var(--color-bgInput)",
                color: isOwn ? "#FFFFFF" : "var(--color-text)",
                border: isOwn ? "none" : "1px solid var(--color-border)",
                borderBottomRightRadius: isOwn ? "0.375rem" : "1rem",
                borderBottomLeftRadius: isOwn ? "1rem" : "0.375rem",
              }}
            >
              {/* Message text */}
              <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                {message.content}
              </p>

              {/* Time + status */}
              <div
                className="flex items-center gap-1.5 mt-1 text-[10px]"
                style={{
                  color: isOwn
                    ? "rgba(255, 255, 255, 0.75)"
                    : "var(--color-textMuted)",
                }}
              >
                <span>{formatTime(message.createdAt)}</span>
                <StatusIcon />
              </div>
            </div>

            {/* Menu button */}
            <button
              onClick={() => setShowMenu(!showMenu)}
              className={`absolute top-1/2 -translate-y-1/2 ${
                isOwn ? "-left-8" : "-right-8"
              } p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200`}
              style={{
                backgroundColor: "var(--color-bgInput)",
                color: "var(--color-textMuted)",
              }}
            >
              <HiOutlineDotsVertical className="text-sm" />
            </button>

            {/* Dropdown menu */}
            <AnimatePresence>
              {showMenu && (
                <>
                  <div
                    onClick={() => setShowMenu(false)}
                    className="fixed inset-0 z-10"
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -5 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -5 }}
                    transition={{ duration: 0.15 }}
                    className={`absolute z-20 ${
                      isOwn ? "right-0" : "left-0"
                    } top-full mt-1 rounded-xl shadow-card-hover overflow-hidden min-w-[180px]`}
                    style={{
                      backgroundColor: "var(--color-bgCard)",
                      border: "1px solid var(--color-border)",
                    }}
                  >
                    <button
                      onClick={() => {
                        onDeleteForMe(message._id);
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 transition-colors hover:bg-black/20"
                      style={{ color: "var(--color-text)" }}
                    >
                      <HiOutlineTrash className="text-base" />
                      Delete for me
                    </button>
                    {isOwn && (
                      <button
                        onClick={() => {
                          onDeleteForEveryone(message._id);
                          setShowMenu(false);
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2 transition-colors border-t"
                        style={{ borderColor: "var(--color-border)" }}
                      >
                        <HiOutlineTrash className="text-base" />
                        Delete for everyone
                      </button>
                    )}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* "Seen" indicator below last seen own message */}
      {isOwn && isLastSeen && message.status === "seen" && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-end px-2 mt-1 mb-2"
        >
          <div
            className="flex items-center gap-1 text-[10px]"
            style={{ color: "var(--color-textMuted)" }}
          >
            <HiCheckBadge className="text-blue-400 text-xs" />
            <span>Seen {message.seenAt ? formatTime(message.seenAt) : ""}</span>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default ChatBubble;
