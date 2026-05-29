import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HiOutlinePaperAirplane,
  HiOutlineEmojiHappy,
  HiOutlineX,
  HiOutlineReply,
} from "react-icons/hi";

const ChatInput = ({
  onSend,
  onTypingStart,
  onTypingStop,
  disabled,
  replyTo,
  onCancelReply,
}) => {
  const [text, setText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const textareaRef = useRef(null);
  const typingTimerRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        120,
      )}px`;
    }
  }, [text]);

  useEffect(() => {
    if (textareaRef.current && !disabled) {
      textareaRef.current.focus();
    }
  }, [disabled, replyTo]);

  const handleChange = (e) => {
    const value = e.target.value;
    setText(value);

    if (value.length > 0 && !isTyping) {
      setIsTyping(true);
      if (onTypingStart) onTypingStart();
    }

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);

    typingTimerRef.current = setTimeout(() => {
      setIsTyping(false);
      if (onTypingStop) onTypingStop();
    }, 1500);
  };

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;

    onSend(trimmed, replyTo);
    setText("");
    setIsTyping(false);
    if (onTypingStop) onTypingStop();
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      if (onTypingStop) onTypingStop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="border-t backdrop-blur-md"
      style={{
        backgroundColor: "var(--color-bgCard)",
        borderColor: "var(--color-border)",
      }}
    >
      {/* Reply Preview */}
      <AnimatePresence>
        {replyTo && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b"
            style={{ borderColor: "var(--color-border)" }}
          >
            <div
              className="flex items-center gap-2 p-2 mx-3 my-2 rounded-lg"
              style={{
                backgroundColor: "var(--color-bgInput)",
                borderLeft: "3px solid var(--color-primary)",
              }}
            >
              <HiOutlineReply
                className="text-base flex-shrink-0"
                style={{ color: "var(--color-primary)" }}
              />
              <div className="flex-1 min-w-0">
                <p
                  className="text-xs font-semibold truncate"
                  style={{ color: "var(--color-primary)" }}
                >
                  {replyTo.sender?.fullName || "Replying to"}
                </p>
                <p
                  className="text-xs truncate"
                  style={{ color: "var(--color-textMuted)" }}
                >
                  {replyTo.content}
                </p>
              </div>
              <button
                onClick={onCancelReply}
                className="p-1 rounded-md flex-shrink-0"
                style={{ color: "var(--color-textMuted)" }}
              >
                <HiOutlineX className="text-base" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-3">
        <div
          className="flex items-end gap-2 rounded-2xl p-2 transition-colors"
          style={{
            backgroundColor: "var(--color-bgInput)",
            border: "1px solid var(--color-border)",
          }}
        >
          <button
            className="p-2 flex-shrink-0 transition-colors"
            style={{ color: "var(--color-textMuted)" }}
            title="Emoji (coming soon)"
            onMouseDown={(e) => e.preventDefault()}
          >
            <HiOutlineEmojiHappy className="text-xl" />
          </button>

          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            disabled={disabled}
            rows={1}
            autoFocus
            className="flex-1 bg-transparent text-sm resize-none outline-none max-h-[120px] py-2 scrollbar-thin"
            style={{ color: "var(--color-text)" }}
          />

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleSend}
            onMouseDown={(e) => e.preventDefault()}
            disabled={!text.trim() || disabled}
            className="p-2.5 rounded-xl flex-shrink-0 transition-all duration-200"
            style={{
              background:
                text.trim() && !disabled
                  ? `linear-gradient(135deg, var(--color-primary) 0%, var(--color-primaryDark) 100%)`
                  : "var(--color-border)",
              color:
                text.trim() && !disabled ? "#FFFFFF" : "var(--color-textMuted)",
              cursor: text.trim() && !disabled ? "pointer" : "not-allowed",
              boxShadow:
                text.trim() && !disabled
                  ? "0 0 15px var(--color-glow)"
                  : "none",
            }}
          >
            <HiOutlinePaperAirplane className="text-lg -rotate-45" />
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default ChatInput;
