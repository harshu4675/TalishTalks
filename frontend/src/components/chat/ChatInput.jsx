import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { HiOutlinePaperAirplane, HiOutlineEmojiHappy } from "react-icons/hi";

const ChatInput = ({ onSend, onTypingStart, onTypingStop, disabled }) => {
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

    onSend(trimmed);
    setText("");
    setIsTyping(false);
    if (onTypingStop) onTypingStop();
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
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
      className="p-3 border-t backdrop-blur-md"
      style={{
        backgroundColor: "var(--color-bgCard)",
        borderColor: "var(--color-border)",
      }}
    >
      <div
        className="flex items-end gap-2 rounded-2xl p-2 transition-colors"
        style={{
          backgroundColor: "var(--color-bgInput)",
          border: "1px solid var(--color-border)",
        }}
      >
        {/* Emoji button */}
        <button
          className="p-2 flex-shrink-0 transition-colors"
          style={{ color: "var(--color-textMuted)" }}
          title="Emoji (coming soon)"
        >
          <HiOutlineEmojiHappy className="text-xl" />
        </button>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          disabled={disabled}
          rows={1}
          className="flex-1 bg-transparent text-sm resize-none outline-none max-h-[120px] py-2 scrollbar-thin"
          style={{
            color: "var(--color-text)",
          }}
        />

        {/* Send button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleSend}
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
              text.trim() && !disabled ? "0 0 15px var(--color-glow)" : "none",
          }}
        >
          <HiOutlinePaperAirplane className="text-lg -rotate-45" />
        </motion.button>
      </div>

      <p
        className="text-[10px] text-center mt-1.5"
        style={{ color: "var(--color-textMuted)", opacity: 0.6 }}
      >
        Press{" "}
        <kbd
          className="px-1 py-0.5 rounded text-[9px]"
          style={{ backgroundColor: "var(--color-bgInput)" }}
        >
          Enter
        </kbd>{" "}
        to send,{" "}
        <kbd
          className="px-1 py-0.5 rounded text-[9px]"
          style={{ backgroundColor: "var(--color-bgInput)" }}
        >
          Shift+Enter
        </kbd>{" "}
        for new line
      </p>
    </div>
  );
};

export default ChatInput;
