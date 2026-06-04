import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import {
  HiOutlineX,
  HiOutlineTrash,
  HiOutlineLockClosed,
  HiOutlineLockOpen,
  HiOutlineBan,
  HiOutlineCheckCircle,
  HiOutlineUserRemove,
  HiOutlineCheck,
} from "react-icons/hi";
import { TbPin, TbPinnedOff } from "react-icons/tb";
import { HiOutlineBellSlash, HiOutlineBell } from "react-icons/hi2";

const ChatActionSheet = ({ isOpen, chat, onClose, onAction }) => {
  if (!chat) return null;

  const actions = [
    {
      id: "pin",
      label: chat.isPinned ? "Unpin chat" : "Pin chat",
      icon: chat.isPinned ? <TbPinnedOff /> : <TbPin />,
      color: "var(--color-text)",
    },
    {
      id: "mute",
      label: chat.isMuted ? "Unmute notifications" : "Mute notifications",
      icon: chat.isMuted ? <HiOutlineBell /> : <HiOutlineBellSlash />,
      color: "var(--color-text)",
    },
    {
      id: "markUnread",
      label: chat.isMarkedUnread ? "Mark as read" : "Mark as unread",
      icon: chat.isMarkedUnread ? <HiOutlineCheckCircle /> : <HiOutlineCheck />,
      color: "var(--color-text)",
    },
    {
      id: "lock",
      label: chat.isLocked ? "Remove lock" : "Lock chat",
      icon: chat.isLocked ? <HiOutlineLockOpen /> : <HiOutlineLockClosed />,
      color: "var(--color-text)",
    },
    {
      id: "select",
      label: "Select",
      icon: <HiOutlineCheck />,
      color: "var(--color-text)",
    },
    {
      id: "block",
      label: chat.iBlockedThem ? "Unblock user" : "Block user",
      icon: <HiOutlineBan />,
      color: chat.iBlockedThem ? "var(--color-text)" : "#ef4444",
    },
    {
      id: "removeFriend",
      label: "Remove friend",
      icon: <HiOutlineUserRemove />,
      color: "#ef4444",
    },
    {
      id: "delete",
      label: "Delete chat",
      icon: <HiOutlineTrash />,
      color: "#ef4444",
    },
  ];

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          />

          {/* Sheet — bottom on mobile, centered on desktop */}
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="fixed z-[101] left-1/2 -translate-x-1/2 bottom-4 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 w-[calc(100%-1.5rem)] max-w-sm rounded-2xl shadow-2xl overflow-hidden"
            style={{
              backgroundColor: "var(--color-bgCard)",
              border: "1px solid var(--color-border)",
            }}
          >
            {/* Header */}
            <div
              className="p-4 flex items-center gap-3 border-b"
              style={{ borderColor: "var(--color-border)" }}
            >
              <img
                src={chat.otherUser?.avatar}
                alt={chat.otherUser?.fullName}
                className="w-10 h-10 rounded-full object-cover"
                style={{ border: "1px solid var(--color-border)" }}
              />
              <div className="flex-1 min-w-0">
                <p
                  className="text-sm font-semibold truncate"
                  style={{ color: "var(--color-text)" }}
                >
                  {chat.otherUser?.fullName}
                </p>
                <p
                  className="text-xs truncate"
                  style={{ color: "var(--color-textMuted)" }}
                >
                  @{chat.otherUser?.username}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-black/20"
                style={{ color: "var(--color-textMuted)" }}
              >
                <HiOutlineX className="text-lg" />
              </button>
            </div>

            {/* Actions */}
            <div className="py-2 max-h-[60vh] overflow-y-auto scrollbar-thin">
              {actions.map((action, idx) => (
                <button
                  key={action.id}
                  onClick={() => {
                    onAction(action.id);
                    onClose();
                  }}
                  className="w-full px-5 py-3 text-left text-sm flex items-center gap-3 transition-colors hover:bg-black/20"
                  style={{ color: action.color }}
                >
                  <span className="text-lg flex-shrink-0">{action.icon}</span>
                  <span className="font-medium">{action.label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
};

export default ChatActionSheet;
