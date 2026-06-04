import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HiOutlineX,
  HiOutlineShare,
  HiOutlineClipboardCopy,
  HiOutlineCheck,
  HiOutlineChat,
} from "react-icons/hi";
import { useBackButton } from "../../hooks/useBackButton";
import { useAuth } from "../../hooks/useAuth";

const InviteFriend = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  useBackButton(isOpen, onClose);

  const appUrl = import.meta.env.VITE_APP_URL || window.location.origin;
  const inviteMessage = `Hey! I'm using Talish Talks to chat privately 💬\n\nJoin me here: ${appUrl}\n\nSearch for me with username: @${user?.username}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = inviteMessage;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleNativeShare = async () => {
    if (!navigator.share) return;
    try {
      await navigator.share({
        title: "Join me on Talish Talks!",
        text: inviteMessage,
        url: appUrl,
      });
    } catch (err) {
      // User cancelled share - do nothing
      if (err.name !== "AbortError") {
        console.error("Share failed:", err);
      }
    }
  };

  const handleShareWhatsApp = () => {
    const encoded = encodeURIComponent(inviteMessage);
    window.open(`https://wa.me/?text=${encoded}`, "_blank");
  };

  const handleShareTelegram = () => {
    const encoded = encodeURIComponent(inviteMessage);
    window.open(
      `https://t.me/share/url?url=${appUrl}&text=${encoded}`,
      "_blank",
    );
  };

  const canNativeShare = typeof navigator !== "undefined" && !!navigator.share;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-md bg-dark-50 rounded-2xl border border-dark-200/50 shadow-card-hover overflow-hidden"
            >
              {/* Header */}
              <div className="p-5 border-b border-dark-200/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-accent flex items-center justify-center">
                    <HiOutlineShare className="text-white text-lg" />
                  </div>
                  <div>
                    <h3 className="text-lg font-display font-semibold text-offwhite">
                      Invite a Friend
                    </h3>
                    <p className="text-xs text-gray-soft">
                      Share Talish Talks with someone
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-dark-100 text-gray-soft hover:text-offwhite transition-colors"
                >
                  <HiOutlineX className="text-lg" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 space-y-4">
                {/* Your username badge */}
                <div
                  className="flex items-center gap-3 p-3 rounded-xl border"
                  style={{
                    backgroundColor: "rgba(232, 113, 58, 0.08)",
                    borderColor: "rgba(232, 113, 58, 0.3)",
                  }}
                >
                  <img
                    src={user?.avatar}
                    alt={user?.fullName}
                    className="w-10 h-10 rounded-full object-cover border-2 border-accent/30"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-offwhite truncate">
                      {user?.fullName}
                    </p>
                    <p className="text-xs text-gray-soft">@{user?.username}</p>
                  </div>
                  <div className="text-xs px-2 py-1 rounded-lg bg-accent/20 text-accent font-medium">
                    Your ID
                  </div>
                </div>

                {/* Invite message preview */}
                <div>
                  <p className="text-xs text-gray-soft mb-2 font-medium uppercase tracking-wide">
                    Invite Message
                  </p>
                  <div
                    className="p-3 rounded-xl text-sm text-gray-soft whitespace-pre-line leading-relaxed border"
                    style={{
                      backgroundColor: "var(--color-bg)",
                      borderColor: "rgba(255,255,255,0.06)",
                    }}
                  >
                    {inviteMessage}
                  </div>
                </div>

                {/* Copy button */}
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleCopy}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all duration-200"
                  style={{
                    background: copied
                      ? "linear-gradient(135deg, #22c55e, #16a34a)"
                      : "linear-gradient(135deg, #E8713A, #c45a2a)",
                    color: "white",
                    boxShadow: copied
                      ? "0 0 20px rgba(34,197,94,0.3)"
                      : "0 0 20px rgba(232,113,58,0.3)",
                  }}
                >
                  <AnimatePresence mode="wait">
                    {copied ? (
                      <motion.span
                        key="copied"
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="flex items-center gap-2"
                      >
                        <HiOutlineCheck className="text-base" />
                        Copied to clipboard!
                      </motion.span>
                    ) : (
                      <motion.span
                        key="copy"
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="flex items-center gap-2"
                      >
                        <HiOutlineClipboardCopy className="text-base" />
                        Copy Invite Message
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>

                {/* Share options */}
                <div>
                  <p className="text-xs text-gray-soft mb-3 font-medium uppercase tracking-wide">
                    Share via
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {/* Native Share - mobile only */}
                    {canNativeShare && (
                      <button
                        onClick={handleNativeShare}
                        className="flex flex-col items-center gap-2 p-3 rounded-xl bg-dark-100 hover:bg-dark-200 transition-colors border border-dark-200/50"
                      >
                        <div className="w-9 h-9 rounded-lg bg-blue-500/20 flex items-center justify-center">
                          <HiOutlineShare className="text-blue-400 text-lg" />
                        </div>
                        <span className="text-[10px] text-gray-soft">
                          Share
                        </span>
                      </button>
                    )}

                    {/* WhatsApp */}
                    <button
                      onClick={handleShareWhatsApp}
                      className="flex flex-col items-center gap-2 p-3 rounded-xl bg-dark-100 hover:bg-dark-200 transition-colors border border-dark-200/50"
                    >
                      <div className="w-9 h-9 rounded-lg bg-green-500/20 flex items-center justify-center">
                        <span className="text-lg">💬</span>
                      </div>
                      <span className="text-[10px] text-gray-soft">
                        WhatsApp
                      </span>
                    </button>

                    {/* Telegram */}
                    <button
                      onClick={handleShareTelegram}
                      className="flex flex-col items-center gap-2 p-3 rounded-xl bg-dark-100 hover:bg-dark-200 transition-colors border border-dark-200/50"
                    >
                      <div className="w-9 h-9 rounded-lg bg-blue-400/20 flex items-center justify-center">
                        <span className="text-lg">✈️</span>
                      </div>
                      <span className="text-[10px] text-gray-soft">
                        Telegram
                      </span>
                    </button>

                    {/* SMS / Other */}
                    <button
                      onClick={() => {
                        const encoded = encodeURIComponent(inviteMessage);
                        window.open(`sms:?body=${encoded}`);
                      }}
                      className="flex flex-col items-center gap-2 p-3 rounded-xl bg-dark-100 hover:bg-dark-200 transition-colors border border-dark-200/50"
                    >
                      <div className="w-9 h-9 rounded-lg bg-purple-500/20 flex items-center justify-center">
                        <HiOutlineChat className="text-purple-400 text-lg" />
                      </div>
                      <span className="text-[10px] text-gray-soft">SMS</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-5 py-3 bg-dark border-t border-dark-200/50">
                <p className="text-xs text-gray-soft/60 text-center">
                  🔒 Talish Talks is end-to-end encrypted
                </p>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default InviteFriend;
