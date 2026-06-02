import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  HiOutlineDotsVertical,
  HiOutlineTrash,
  HiCheck,
  HiOutlineReply,
  HiOutlinePencil,
  HiOutlineClipboardCopy,
  HiOutlinePlay,
} from "react-icons/hi";
import { HiCheckBadge } from "react-icons/hi2";
import toast from "react-hot-toast";
import MediaViewer from "./MediaViewer";
import EditMessageModal from "./EditMessageModal";

const ChatBubble = ({
  message,
  isOwn,
  isLastSeen,
  onDeleteForMe,
  onDeleteForEveryone,
  onReply,
  onEdit,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [showMediaViewer, setShowMediaViewer] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [showReplyHint, setShowReplyHint] = useState(false);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isDragging = useRef(false);
  const buttonRef = useRef(null);

  if (message.deletedForEveryone) {
    return null;
  }

  const hasMedia =
    message.messageType === "image" || message.messageType === "video";
  const isImage = message.messageType === "image";
  const isVideo = message.messageType === "video";

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

  // Swipe handlers
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

  // Menu positioning with portal
  const handleMenuClick = (e) => {
    e.stopPropagation();
    if (!showMenu && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const menuWidth = 200;
      const menuHeight = 240;
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;

      let left = rect.right - menuWidth;
      let top = rect.bottom + 5;

      if (left < 10) left = 10;
      if (left + menuWidth > windowWidth - 10)
        left = windowWidth - menuWidth - 10;
      if (top + menuHeight > windowHeight - 10) top = rect.top - menuHeight - 5;

      setMenuPosition({ top, left });
    }
    setShowMenu(!showMenu);
  };

  useEffect(() => {
    if (!showMenu) return;
    const handleScroll = () => setShowMenu(false);
    window.addEventListener("scroll", handleScroll, true);
    return () => window.removeEventListener("scroll", handleScroll, true);
  }, [showMenu]);

  // Copy text to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      toast.success("Copied to clipboard! 📋");
    } catch (err) {
      toast.error("Failed to copy");
    }
    setShowMenu(false);
  };

  // Handle edit
  const handleEditClick = () => {
    setShowMenu(false);
    setShowEditModal(true);
  };

  const handleEditSave = (newContent) => {
    if (onEdit) onEdit(message._id, newContent);
    setShowEditModal(false);
  };

  // Media auto-delete countdown (for media messages)
  const [timeLeft, setTimeLeft] = useState(null);
  useEffect(() => {
    if (!hasMedia || !message.mediaAutoDeleteAt) return;

    const interval = setInterval(() => {
      const remaining =
        new Date(message.mediaAutoDeleteAt).getTime() - Date.now();
      if (remaining <= 0) {
        setTimeLeft(null);
        clearInterval(interval);
      } else {
        setTimeLeft(Math.ceil(remaining / 1000));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [hasMedia, message.mediaAutoDeleteAt]);

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
            style={{ color: showReplyHint ? "white" : "var(--color-primary)" }}
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
        className={`flex ${isOwn ? "justify-end" : "justify-start"} group px-1 relative z-10`}
      >
        <div
          className={`flex items-end gap-2 max-w-[80%] ${
            isOwn ? "flex-row-reverse" : "flex-row"
          }`}
        >
          <div className="relative">
            <div
              className="rounded-2xl shadow-sm transition-all select-none overflow-hidden"
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
              {/* Reply Preview */}
              {message.replyTo && (
                <div
                  className="mx-2 mt-2 p-2 rounded-lg cursor-pointer"
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
                    {message.replyTo.messageType === "image"
                      ? "📷 Photo"
                      : message.replyTo.messageType === "video"
                        ? "📹 Video"
                        : message.replyTo.content || "Message"}
                  </p>
                </div>
              )}

              {/* 🔥 MEDIA DISPLAY (single block - with upload progress) */}
              {hasMedia && message.media?.url && (
                <div
                  className="relative cursor-pointer"
                  onClick={() =>
                    !message.isOptimistic && setShowMediaViewer(true)
                  }
                >
                  {isImage ? (
                    <img
                      src={message.media.url}
                      alt="Sent media"
                      className="w-full max-w-[280px] max-h-[300px] object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="relative">
                      <video
                        src={message.media.url}
                        className="w-full max-w-[280px] max-h-[300px] object-cover"
                        muted
                        playsInline
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                          <HiOutlinePlay className="text-2xl text-black ml-1" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Upload Progress Overlay */}
                  {message.isOptimistic && (
                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
                      <div className="w-16 h-16 mb-3">
                        <svg className="w-full h-full -rotate-90">
                          <circle
                            cx="32"
                            cy="32"
                            r="28"
                            stroke="rgba(255,255,255,0.2)"
                            strokeWidth="4"
                            fill="none"
                          />
                          <circle
                            cx="32"
                            cy="32"
                            r="28"
                            stroke="white"
                            strokeWidth="4"
                            fill="none"
                            strokeDasharray={2 * Math.PI * 28}
                            strokeDashoffset={
                              2 *
                              Math.PI *
                              28 *
                              (1 - (message.uploadProgress || 0) / 100)
                            }
                            className="transition-all duration-300"
                          />
                        </svg>
                      </div>
                      <p className="text-white text-xs font-semibold">
                        {message.uploadProgress || 0}%
                      </p>
                    </div>
                  )}

                  {/* Auto-delete countdown */}
                  {timeLeft !== null && !message.isOptimistic && (
                    <div
                      className="absolute top-2 left-2 px-2 py-1 rounded-full text-[10px] font-semibold backdrop-blur-md flex items-center gap-1"
                      style={{
                        backgroundColor: "rgba(0,0,0,0.6)",
                        color: "white",
                      }}
                    >
                      ⏱️ {timeLeft}s
                    </div>
                  )}
                </div>
              )}

              {/* Message text + Time */}
              <div
                className="px-3 py-2"
                style={{
                  paddingRight: "2rem",
                  paddingTop:
                    hasMedia && !message.content ? "0.5rem" : "0.5rem",
                  paddingBottom: "0.5rem",
                }}
              >
                {message.content && (
                  <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                    {message.content}
                  </p>
                )}

                <div
                  className="flex items-center gap-1.5 mt-1 text-[10px]"
                  style={{
                    color: isOwn
                      ? "rgba(255, 255, 255, 0.75)"
                      : "var(--color-textMuted)",
                  }}
                >
                  {message.edited && <span className="italic">edited</span>}
                  <span>{formatTime(message.createdAt)}</span>
                  <StatusIcon />
                </div>
              </div>
            </div>

            {/* Menu Button */}
            <button
              ref={buttonRef}
              onClick={handleMenuClick}
              className="absolute top-1.5 right-1.5 p-1 rounded-full transition-all duration-200 z-10"
              style={{
                backgroundColor: isOwn
                  ? "rgba(255,255,255,0.2)"
                  : "rgba(0,0,0,0.3)",
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

      {/* PORTAL: Dropdown menu */}
      {showMenu &&
        createPortal(
          <>
            <div
              onClick={() => setShowMenu(false)}
              className="fixed inset-0 z-[9998]"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -5 }}
              transition={{ duration: 0.15 }}
              className="fixed rounded-xl overflow-hidden min-w-[200px] shadow-2xl"
              style={{
                top: `${menuPosition.top}px`,
                left: `${menuPosition.left}px`,
                backgroundColor: "var(--color-bgCard)",
                border: "1px solid var(--color-border)",
                zIndex: 9999,
              }}
            >
              {/* Reply */}
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

              {/* Copy (only for text messages) */}
              {message.content && (
                <button
                  onClick={handleCopy}
                  className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 transition-colors hover:bg-black/20 border-b"
                  style={{
                    color: "var(--color-text)",
                    borderColor: "var(--color-border)",
                  }}
                >
                  <HiOutlineClipboardCopy className="text-base" />
                  Copy text
                </button>
              )}

              {/* Edit (only own text messages) */}
              {isOwn && message.messageType === "text" && (
                <button
                  onClick={handleEditClick}
                  className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 transition-colors hover:bg-black/20 border-b"
                  style={{
                    color: "var(--color-text)",
                    borderColor: "var(--color-border)",
                  }}
                >
                  <HiOutlinePencil className="text-base" />
                  Edit
                </button>
              )}

              {/* Delete for me */}
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

              {/* Delete for everyone (own messages) */}
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
          document.body,
        )}

      {/* Media Viewer */}
      <MediaViewer
        isOpen={showMediaViewer}
        onClose={() => setShowMediaViewer(false)}
        media={message.media}
        senderName={
          typeof message.sender === "object" ? message.sender.fullName : "User"
        }
        timestamp={message.createdAt}
      />

      {/* Edit Modal */}
      <EditMessageModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        message={message}
        onSave={handleEditSave}
      />
    </div>
  );
};

export default ChatBubble;
