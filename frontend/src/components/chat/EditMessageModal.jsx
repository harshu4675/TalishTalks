import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HiOutlineX, HiOutlinePencil, HiCheck } from "react-icons/hi";
import toast from "react-hot-toast";
import { useBackButton } from "../../hooks/useBackButton";

const EditMessageModal = ({ isOpen, onClose, message, onSave }) => {
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef(null);

  useBackButton(isOpen, onClose);

  useEffect(() => {
    if (isOpen && message?.content) {
      setContent(message.content);
      setTimeout(() => {
        textareaRef.current?.focus();
        textareaRef.current?.setSelectionRange(
          message.content.length,
          message.content.length,
        );
      }, 100);
    }
  }, [isOpen, message]);

  const handleSave = async () => {
    const trimmed = content.trim();
    if (!trimmed) {
      toast.error("Message cannot be empty");
      return;
    }

    if (trimmed === message.content) {
      onClose();
      return;
    }

    setSaving(true);
    try {
      await onSave(trimmed);
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[300]"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed inset-0 z-[301] flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl shadow-2xl pointer-events-auto overflow-hidden"
              style={{
                backgroundColor: "var(--color-bgCard)",
                border: "1px solid var(--color-border)",
              }}
            >
              {/* Header */}
              <div
                className="p-4 border-b flex items-center justify-between"
                style={{ borderColor: "var(--color-border)" }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{
                      background:
                        "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primaryDark) 100%)",
                    }}
                  >
                    <HiOutlinePencil className="text-white text-base" />
                  </div>
                  <div>
                    <h3
                      className="font-semibold text-base"
                      style={{ color: "var(--color-text)" }}
                    >
                      Edit Message
                    </h3>
                    <p
                      className="text-xs"
                      style={{ color: "var(--color-textMuted)" }}
                    >
                      Make changes to your message
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-black/20 transition-colors"
                  style={{ color: "var(--color-textMuted)" }}
                >
                  <HiOutlineX className="text-lg" />
                </button>
              </div>

              {/* Body */}
              <div className="p-4">
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={4}
                  className="input-dark resize-none w-full"
                  placeholder="Edit your message..."
                  disabled={saving}
                />

                <p
                  className="text-xs mt-2"
                  style={{ color: "var(--color-textMuted)" }}
                >
                  💡 Press Enter to save, Shift+Enter for new line
                </p>
              </div>

              {/* Footer */}
              <div
                className="p-4 border-t flex gap-2"
                style={{ borderColor: "var(--color-border)" }}
              >
                <button
                  onClick={onClose}
                  disabled={saving}
                  className="btn-ghost flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!content.trim() || saving}
                  className="btn-accent flex-1 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <HiCheck className="text-base" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default EditMessageModal;
