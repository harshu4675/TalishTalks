import React, { useState, useRef } from "react";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
} from "framer-motion";
import {
  HiOutlineDotsVertical,
  HiOutlineTrash,
  HiCheck,
  HiOutlineReply,
} from "react-icons/hi";
import { HiCheckBadge } from "react-icons/hi2";

const ChatBubble = ({
  message,
  isOwn,
  isLastSeen,
  onDeleteForMe,
  onDeleteForEveryone,
  onReply,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const x = useMotionValue(0);
  const replyIconOpacity = useTransform(x, [0, 50, 100], [0, 0.5, 1]);
  const replyIconScale = useTransform(x, [0, 50, 100], [0.5, 0.8, 1]);

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

  const StatusIcon = () => {
    if (!isOwn) return null;

    if (message.status === "sending") {
      return (
        <div
          className="w-3 h-3 border border-white/60 border-t-transparent rounded-full animate-spin"
          title="Sending"
        />
      );
    }
    if (message.status === "seen") {
      return (
        <div className="flex items-center gap-0.5" title="Seen">
          <HiCheck className="text-blue-300 text-sm -mr-2" />
          <HiCheck className="text-blue-300 text-sm" />
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

  // Swipe handler - drag right to reply
  const handleDragEnd = (event, info) => {
    if (info.offset.x > 80) {
      // Triggered reply
      if (onReply) onReply(message);
    }
    x.set(0);
  };

  return (
    <div className="flex flex-col relative">
      {/* Swipe reply icon (appears when dragging) */}
      <motion.div
        style={{ opacity: replyIconOpacity, scale: replyIconScale }}
        className={`absolute top-1/2 -translate-y-1/2 ${
          isOwn ? "right-4" : "left-4"
        } pointer-events-none z-0`}
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ backgroundColor: "var(--color-primary)" }}
        >
          <HiOutlineReply className="text-white text-base" />
        </div>
      </motion.div>

      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 100 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        style={{ x }}
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className={`flex ${isOwn ? "justify-end" : "justify-start"} group px-1 relative z-10`}
      >
        <div
          className={`flex items-end gap-2 max-w-[75%] ${
            isOwn ? "flex-row-reverse" : "flex-row"
          }`}
        >
          <div className="relative">
            <div
              className="px-3 py-2 rounded-2xl shadow-sm transition-all"
              style={{
                background: isOwn
                  ? `linear-gradient(135deg, var(--color-primary) 0%, var(--color-primaryDark) 100%)`
                  : "var(--color-bgInput)",
                color: isOwn ? "#FFFFFF" : "var(--color-text)",
                border: isOwn ? "none" : "1px solid var(--color-border)",
                borderBottomRightRadius: isOwn ? "0.375rem" : "1rem",
                borderBottomLeftRadius: isOwn ? "1rem" : "0.375rem",
                opacity: message.isOptimistic ? 0.7 : 1,
              }}
            >
              {/* 🔥 REPLY PREVIEW (if this message is replying to another) */}
              {message.replyTo && (
                <div
                  className="mb-1.5 p-2 rounded-lg cursor-pointer"
                  style={{
                    backgroundColor: isOwn
                      ? "rgba(255,255,255,0.15)"
                      : "var(--color-bg)",
                    borderLeft: `3px solid ${
                      isOwn ? "rgba(255,255,255,0.6)" : "var(--color-primary)"
                    }`,
                  }}
                >
                  <p
                    className="text-[10px] font-semibold mb-0.5"
                    style={{
                      color: isOwn
                        ? "rgba(255,255,255,0.9)"
                        : "var(--color-primary)",
                    }}
                  >
                    {message.replyTo.sender?.fullName ||
                      message.replyTo.sender?.username ||
                      "Replied"}
                  </p>
                  <p
                    className="text-xs truncate max-w-[200px]"
                    style={{
                      color: isOwn
                        ? "rgba(255,255,255,0.75)"
                        : "var(--color-textMuted)",
                    }}
                  >
                    {message.replyTo.content || "Message"}
                  </p>
                </div>
              )}

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

            {/* Menu button (desktop hover) */}
            <button
              onClick={() => setShowMenu(!showMenu)}
              className={`absolute top-1/2 -translate-y-1/2 ${
                isOwn ? "-left-8" : "-right-8"
              } p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 hidden md:block`}
              style={{
                backgroundColor: "var(--color-bgInput)",
                color: "var(--color-textMuted)",
              }}
            >
              <HiOutlineDotsVertical className="text-sm" />
            </button>

            {/* Mobile: long-press menu trigger (always visible small dot) */}
            <button
              onClick={() => setShowMenu(!showMenu)}
              className={`absolute top-1/2 -translate-y-1/2 ${
                isOwn ? "-left-7" : "-right-7"
              } p-1 rounded-full md:hidden opacity-60`}
              style={{
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
                    {/* 🔥 REPLY OPTION */}
                    <button
                      onClick={() => {
                        if (onReply) onReply(message);
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 transition-colors hover:bg-black/20 border-b"
                      style={{
                        color: "var(--color-text)",
                        borderColor: "var(--color-border)",
                      }}
                    >
                      <HiOutlineReply className="text-base" />
                      Reply
                    </button>

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

      {/* "Seen" indicator */}
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
