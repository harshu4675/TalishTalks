import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HiOutlineLockClosed,
  HiOutlineSearch,
  HiOutlineX,
  HiOutlineCheck,
} from "react-icons/hi";

const FirstLockGuide = ({ isOpen, onClose }) => {
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
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200]"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-[201] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.25 }}
              className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl"
              style={{
                backgroundColor: "var(--color-bgCard)",
                border: "1px solid var(--color-border)",
              }}
            >
              {/* Header gradient */}
              <div
                className="p-6 text-center relative"
                style={{
                  background: `linear-gradient(135deg, var(--color-primary) 0%, var(--color-primaryDark) 100%)`,
                }}
              >
                <button
                  onClick={onClose}
                  className="absolute top-3 right-3 p-1.5 rounded-lg text-white/80 hover:bg-white/10 transition-colors"
                >
                  <HiOutlineX className="text-lg" />
                </button>

                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{
                    delay: 0.1,
                    type: "spring",
                    stiffness: 200,
                  }}
                  className="inline-flex w-16 h-16 rounded-full bg-white/20 backdrop-blur-md items-center justify-center mb-3"
                >
                  <HiOutlineLockClosed className="text-white text-3xl" />
                </motion.div>

                <h2 className="text-xl font-bold text-white">
                  Chat Locked! 🎉
                </h2>
                <p className="text-white/90 text-sm mt-1">
                  Your chat is now private and hidden
                </p>
              </div>

              {/* Body */}
              <div className="p-6 space-y-5">
                <div>
                  <h3
                    className="text-sm font-bold mb-3"
                    style={{ color: "var(--color-text)" }}
                  >
                    📖 How to find your locked chats:
                  </h3>

                  <div className="space-y-3">
                    {/* Step 1 */}
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                      className="flex items-start gap-3"
                    >
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white"
                        style={{ backgroundColor: "var(--color-primary)" }}
                      >
                        1
                      </div>
                      <div>
                        <p
                          className="text-sm font-medium"
                          style={{ color: "var(--color-text)" }}
                        >
                          Go to the search bar
                        </p>
                        <p
                          className="text-xs mt-0.5"
                          style={{ color: "var(--color-textMuted)" }}
                        >
                          At the top of your chats list
                        </p>
                      </div>
                    </motion.div>

                    {/* Step 2 */}
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 }}
                      className="flex items-start gap-3"
                    >
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white"
                        style={{ backgroundColor: "var(--color-primary)" }}
                      >
                        2
                      </div>
                      <div>
                        <p
                          className="text-sm font-medium"
                          style={{ color: "var(--color-text)" }}
                        >
                          Type your 4-digit PIN
                        </p>
                        <p
                          className="text-xs mt-0.5"
                          style={{ color: "var(--color-textMuted)" }}
                        >
                          The same PIN you just set
                        </p>
                      </div>
                    </motion.div>

                    {/* Step 3 */}
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 }}
                      className="flex items-start gap-3"
                    >
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white"
                        style={{ backgroundColor: "var(--color-primary)" }}
                      >
                        3
                      </div>
                      <div>
                        <p
                          className="text-sm font-medium"
                          style={{ color: "var(--color-text)" }}
                        >
                          Locked chats appear! 🔓
                        </p>
                        <p
                          className="text-xs mt-0.5"
                          style={{ color: "var(--color-textMuted)" }}
                        >
                          They auto-hide when you clear search
                        </p>
                      </div>
                    </motion.div>
                  </div>
                </div>

                {/* Visual demo */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="rounded-xl p-3"
                  style={{
                    backgroundColor: "var(--color-bgInput)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <div
                    className="flex items-center gap-2 px-3 py-2 rounded-lg"
                    style={{
                      backgroundColor: "var(--color-bg)",
                      border: "1px solid var(--color-primary)",
                    }}
                  >
                    <HiOutlineSearch
                      className="text-base"
                      style={{ color: "var(--color-textMuted)" }}
                    />
                    <span
                      className="text-sm font-mono tracking-widest"
                      style={{ color: "var(--color-primary)" }}
                    >
                      1234
                    </span>
                    <motion.span
                      animate={{ opacity: [1, 0, 1] }}
                      transition={{ repeat: Infinity, duration: 1 }}
                      style={{ color: "var(--color-primary)" }}
                    >
                      |
                    </motion.span>
                  </div>
                  <p
                    className="text-[10px] mt-2 text-center"
                    style={{ color: "var(--color-textMuted)" }}
                  >
                    Example: Type your PIN like this
                  </p>
                </motion.div>

                {/* Pro tips */}
                <div
                  className="rounded-xl p-3 space-y-1.5"
                  style={{
                    backgroundColor: "rgba(34, 197, 94, 0.08)",
                    border: "1px solid rgba(34, 197, 94, 0.2)",
                  }}
                >
                  <p className="text-xs font-semibold text-green-500">
                    💡 Pro Tips
                  </p>
                  <ul
                    className="text-xs space-y-1"
                    style={{ color: "var(--color-textMuted)" }}
                  >
                    <li>• Same PIN unlocks ALL your locked chats</li>
                    <li>• Auto-hides when you minimize the app</li>
                    <li>
                      • To remove lock permanently: chat menu → Remove Lock
                    </li>
                  </ul>
                </div>

                {/* CTA button */}
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  onClick={onClose}
                  className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all flex items-center justify-center gap-2"
                  style={{
                    background:
                      "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primaryDark) 100%)",
                    boxShadow: "0 0 20px var(--color-glow)",
                  }}
                >
                  <HiOutlineCheck className="text-base" />
                  Got it!
                </motion.button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default FirstLockGuide;
