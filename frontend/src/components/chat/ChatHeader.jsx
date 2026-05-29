import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HiOutlineArrowLeft,
  HiOutlineDotsVertical,
  HiOutlineTrash,
  HiOutlineClock,
  HiOutlineEye,
  HiOutlineX,
} from "react-icons/hi";
import toast from "react-hot-toast";
import { chatAPI } from "../../services/api";

const ChatHeader = ({ chat, isOnline, isTyping, onBack, onChatCleared }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showDisappearMenu, setShowDisappearMenu] = useState(false);
  const otherUser = chat.otherUser;

  const handleClearChat = async () => {
    if (!window.confirm("Clear entire chat history? This cannot be undone."))
      return;
    try {
      await chatAPI.clearChat(chat._id);
      toast.success("Chat cleared 🧹");
      setShowMenu(false);
      if (onChatCleared) onChatCleared();
    } catch (err) {
      toast.error("Failed to clear chat");
    }
  };

  const handleDisappearingMode = async (mode) => {
    try {
      const res = await chatAPI.setDisappearing(chat._id, { mode });
      toast.success(res.data.message);
      setShowDisappearMenu(false);
      setShowMenu(false);
    } catch (err) {
      toast.error("Failed to update disappearing messages");
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
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const disappearingMode = chat.disappearingMessages?.mode || "off";
  const disappearingEnabled = disappearingMode !== "off";

  return (
    <div
      className="backdrop-blur-md border-b px-2 py-2 sm:p-3 flex items-center justify-between sticky top-0 z-30 flex-shrink-0"
      style={{
        backgroundColor: "var(--color-bgCard)",
        borderColor: "var(--color-border)",
      }}
    >
      {/* Left: Back + User Info */}
      <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
        <button
          onClick={onBack}
          className="p-1.5 sm:p-2 rounded-lg transition-colors lg:hidden hover:bg-black/20 flex-shrink-0"
          style={{ color: "var(--color-textMuted)" }}
        >
          <HiOutlineArrowLeft className="text-xl" />
        </button>

        <div className="relative flex-shrink-0">
          <img
            src={otherUser.avatar}
            alt={otherUser.fullName}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover"
            style={{ border: "1px solid var(--color-border)" }}
          />
          {isOnline && (
            <div
              className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full"
              style={{ border: `2px solid var(--color-bgCard)` }}
            />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p
            className="text-sm font-semibold truncate leading-tight"
            style={{ color: "var(--color-text)" }}
          >
            {otherUser.fullName}
          </p>
          <p
            className="text-[11px] truncate leading-tight mt-0.5"
            style={{ color: "var(--color-textMuted)" }}
          >
            {isTyping ? (
              <span
                className="animate-pulse"
                style={{ color: "var(--color-primary)" }}
              >
                typing...
              </span>
            ) : isOnline ? (
              <span className="text-green-400">● online</span>
            ) : (
              `Last seen ${formatLastSeen(otherUser.lastSeen)}`
            )}
          </p>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {disappearingEnabled && (
          <div
            className="flex items-center gap-1 px-1.5 py-1 rounded-lg text-xs"
            style={{
              backgroundColor: "rgba(124, 58, 237, 0.1)",
              border: "1px solid var(--color-primary)",
              color: "var(--color-primary)",
            }}
            title={`Disappearing: ${
              disappearingMode === "on_seen" ? "On seen" : "After 2 min"
            }`}
          >
            <HiOutlineClock className="text-sm" />
            <span className="hidden sm:inline text-[11px]">
              {disappearingMode === "on_seen" ? "On seen" : "2 min"}
            </span>
          </div>
        )}

        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 sm:p-2 rounded-lg transition-colors hover:bg-black/20"
            style={{ color: "var(--color-textMuted)" }}
          >
            <HiOutlineDotsVertical className="text-lg" />
          </button>

          <AnimatePresence>
            {showMenu && (
              <>
                <div
                  onClick={() => {
                    setShowMenu(false);
                    setShowDisappearMenu(false);
                  }}
                  className="fixed inset-0 z-[90]"
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -5 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-1 z-[100] rounded-xl shadow-card-hover overflow-hidden min-w-[220px]"
                  style={{
                    backgroundColor: "var(--color-bgCard)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <button
                    onClick={() => setShowDisappearMenu(!showDisappearMenu)}
                    className="w-full px-4 py-2.5 text-left text-sm flex items-center justify-between gap-2 transition-colors hover:bg-black/20"
                    style={{ color: "var(--color-text)" }}
                  >
                    <span className="flex items-center gap-2">
                      <HiOutlineClock className="text-base" />
                      Disappearing
                    </span>
                    <span
                      className="text-xs"
                      style={{ color: "var(--color-textMuted)" }}
                    >
                      {disappearingMode === "off"
                        ? "Off"
                        : disappearingMode === "on_seen"
                          ? "On seen"
                          : "2 min"}
                    </span>
                  </button>

                  <AnimatePresence>
                    {showDisappearMenu && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden border-y"
                        style={{
                          backgroundColor: "var(--color-bg)",
                          borderColor: "var(--color-border)",
                        }}
                      >
                        {[
                          {
                            mode: "off",
                            label: "Off",
                            icon: <HiOutlineX className="text-sm" />,
                          },
                          {
                            mode: "on_seen",
                            label: "When seen",
                            icon: <HiOutlineEye className="text-sm" />,
                          },
                          {
                            mode: "after_2min",
                            label: "2 min after seen",
                            icon: <HiOutlineClock className="text-sm" />,
                          },
                        ].map((item) => (
                          <button
                            key={item.mode}
                            onClick={() => handleDisappearingMode(item.mode)}
                            className="w-full px-6 py-2 text-left text-xs transition-colors flex items-center justify-between hover:bg-black/20"
                            style={{
                              color:
                                disappearingMode === item.mode
                                  ? "var(--color-primary)"
                                  : "var(--color-text)",
                            }}
                          >
                            <span className="flex items-center gap-2">
                              {item.icon} {item.label}
                            </span>
                            {disappearingMode === item.mode && (
                              <span style={{ color: "var(--color-primary)" }}>
                                ✓
                              </span>
                            )}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <button
                    onClick={handleClearChat}
                    className="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2 transition-colors border-t"
                    style={{ borderColor: "var(--color-border)" }}
                  >
                    <HiOutlineTrash className="text-base" />
                    Clear Chat
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default ChatHeader;
