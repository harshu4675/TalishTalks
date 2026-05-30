import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
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
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [dragX, setDragX] = useState(0);
  const [showReplyHint, setShowReplyHint] = useState(false);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isDragging = useRef(false);
  const buttonRef = useRef(null);

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

    if (diffY > Math.abs(diffX)) return;

    const validDrag = isOwn ? diffX < 0 : diffX > 0;

    if (validDrag) {
      isDragging.current = true;
      const limitedDrag = Math.max(-100, Math.min(100, diffX));
      setDragX(limitedDrag);
      setShowReplyHint(Math.abs(limitedDrag) > 60);
    }
  };

  const handleTouchEnd = () => {
    if (isDragging.current && Math.abs(dragX) > 60) {
      if (onReply) onReply(message);
    }
    setDragX(0);
    setShowReplyHint(false);
    isDragging.current = false;
    touchStartX.current = 0;
  };

  const handleDoubleClick = () => {
    if (onReply) onReply(message);
  };

  // 🔥 Calculate menu position for portal
  const handleMenuClick = (e) => {
    e.stopPropagation();
    if (!showMenu && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const menuWidth = 180;
      const menuHeight = 150; // approx
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;

      let left = rect.right - menuWidth;
      let top = rect.bottom + 5;

      // Adjust if menu would go off-screen
      if (left < 10) left = 10;
      if (left + menuWidth > windowWidth - 10) {
        left = windowWidth - menuWidth - 10;
      }
      if (top + menuHeight > windowHeight - 10) {
        top = rect.top - menuHeight - 5; // Show above button
      }

      setMenuPosition({ top, left });
    }
    setShowMenu(!showMenu);
  };

  // Close menu on scroll
  useEffect(() => {
    if (!showMenu) return;
    const handleScroll = () => setShowMenu(false);
    window.addEventListener("scroll", handleScroll, true);
    return () => window.removeEventListener("scroll", handleScroll, true);
  }, [showMenu]);

  return (
    <div className="flex flex-col relative">
      {/* Swipe reply icon */}
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
                paddingRight: "2rem",
              }}
            >
              {/* Reply Preview */}
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

            {/* Menu Button - INSIDE bubble */}
            <button
              ref={buttonRef}
              onClick={handleMenuClick}
              className="absolute top-1.5 right-1.5 p-1 rounded-full transition-all duration-200 z-10"
              style={{
                backgroundColor: isOwn
                  ? "rgba(255,255,255,0.2)"
                  : "rgba(0,0,0,0.2)",
                color: isOwn ? "white" : "var(--color-textMuted)",
              }}
              title="Options"
            >
              <HiOutlineDotsVertical className="text-sm" />
            </button>
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

      {/* 🔥 PORTAL: Dropdown menu rendered OUTSIDE component tree */}
      {showMenu &&
        createPortal(
          <>
            {/* Backdrop */}
            <div
              onClick={() => setShowMenu(false)}
              className="fixed inset-0 z-[9998]"
              style={{ backgroundColor: "transparent" }}
            />

            {/* Dropdown */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -5 }}
              transition={{ duration: 0.15 }}
              className="fixed rounded-xl overflow-hidden min-w-[180px] shadow-2xl"
              style={{
                top: `${menuPosition.top}px`,
                left: `${menuPosition.left}px`,
                backgroundColor: "var(--color-bgCard)",
                border: "1px solid var(--color-border)",
                zIndex: 9999,
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
          </>,
          document.body, // 🔥 Render directly to body
        )}
    </div>
  );
};

export default ChatBubble;
