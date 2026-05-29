import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  const [dragX, setDragX] = useState(0);
  const [showReplyHint, setShowReplyHint] = useState(false);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isDragging = useRef(false);

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

  // 🔥 NATIVE TOUCH HANDLERS - work better than framer-motion drag on mobile
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isDragging.current = false;
  };

  const handleTouchMove = (e) => {
    if (!touchStartX.current) return;

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = currentX - touchStartX.current;
    const diffY = Math.abs(currentY - touchStartY.current);

    // Only horizontal drag - if more vertical, ignore (let scroll work)
    if (diffY > Math.abs(diffX)) {
      return;
    }

    // 🔥 SWIPE LEFT for own messages (drag goes negative)
    // 🔥 SWIPE RIGHT for other's messages (drag goes positive)
    const validDrag = isOwn ? diffX < 0 : diffX > 0;

    if (validDrag) {
      isDragging.current = true;
      const limitedDrag = Math.max(-100, Math.min(100, diffX));
      setDragX(limitedDrag);

      if (Math.abs(limitedDrag) > 60) {
        setShowReplyHint(true);
      } else {
        setShowReplyHint(false);
      }
    }
  };

  const handleTouchEnd = () => {
    if (isDragging.current && Math.abs(dragX) > 60) {
      // Trigger reply
      if (onReply) onReply(message);
    }
    setDragX(0);
    setShowReplyHint(false);
    isDragging.current = false;
    touchStartX.current = 0;
  };

  // Double-click to reply (desktop)
  const handleDoubleClick = () => {
    if (onReply) onReply(message);
  };

  return (
    <div className="flex flex-col relative overflow-hidden">
      {/* Reply Icon (appears when swiping) */}
      <div
        className={`absolute top-1/2 -translate-y-1/2 transition-opacity ${
          isOwn ? "right-2" : "left-2"
        }`}
        style={{
          opacity: Math.abs(dragX) / 80,
          pointerEvents: "none",
        }}
      >
        <div
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-transform ${
            showReplyHint ? "scale-110" : "scale-90"
          }`}
          style={{
            backgroundColor: showReplyHint
              ? "var(--color-primary)"
              : "var(--color-bgInput)",
          }}
        >
          <HiOutlineReply
            className="text-base"
            style={{
              color: showReplyHint ? "white" : "var(--color-primary)",
            }}
          />
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onDoubleClick={handleDoubleClick}
        style={{
          transform: `translateX(${dragX}px)`,
          transition: dragX === 0 ? "transform 0.3s ease-out" : "none",
        }}
        className={`flex ${
          isOwn ? "justify-end" : "justify-start"
        } group px-1 relative z-10`}
      >
        <div
          className={`flex items-end gap-2 max-w-[75%] ${
            isOwn ? "flex-row-reverse" : "flex-row"
          }`}
        >
          <div className="relative">
            <div
              className="px-3 py-2 rounded-2xl shadow-sm transition-all select-none"
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
              {/* Reply Preview inside bubble */}
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

              <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                {message.content}
              </p>

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

            {/* Menu button - Desktop hover */}
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

            {/* Menu button - Mobile always visible */}
            <button
              onClick={() => setShowMenu(!showMenu)}
              className={`absolute top-1/2 -translate-y-1/2 ${
                isOwn ? "-left-7" : "-right-7"
              } p-1 rounded-full md:hidden opacity-60`}
              style={{ color: "var(--color-textMuted)" }}
            >
              <HiOutlineDotsVertical className="text-sm" />
            </button>

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
