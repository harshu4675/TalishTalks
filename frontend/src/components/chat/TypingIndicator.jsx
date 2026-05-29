import React from "react";
import { motion } from "framer-motion";

const TypingIndicator = ({ name }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 5 }}
      className="flex justify-start px-1"
    >
      <div
        className="rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2"
        style={{
          backgroundColor: "var(--color-bgInput)",
          border: "1px solid var(--color-border)",
        }}
      >
        <div className="flex items-center gap-1">
          <span
            className="w-2 h-2 rounded-full typing-dot"
            style={{ backgroundColor: "var(--color-primary)" }}
          />
          <span
            className="w-2 h-2 rounded-full typing-dot"
            style={{ backgroundColor: "var(--color-primary)" }}
          />
          <span
            className="w-2 h-2 rounded-full typing-dot"
            style={{ backgroundColor: "var(--color-primary)" }}
          />
        </div>
        <span className="text-xs" style={{ color: "var(--color-textMuted)" }}>
          {name} is typing...
        </span>
      </div>
    </motion.div>
  );
};

export default TypingIndicator;
