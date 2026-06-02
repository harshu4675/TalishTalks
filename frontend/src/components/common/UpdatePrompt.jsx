import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRegisterSW } from "virtual:pwa-register/react";
import { HiOutlineRefresh, HiOutlineX, HiSparkles } from "react-icons/hi";
import { useBackButton } from "../../hooks/useBackButton"; // 🔥 NEW

const UpdatePrompt = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [updating, setUpdating] = useState(false);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(swRegistration) {
      console.log("✅ Service Worker registered");
      if (swRegistration) {
        setInterval(() => {
          swRegistration.update();
        }, 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.error("❌ Service Worker registration error:", error);
    },
    onNeedRefresh() {
      console.log("🔄 New version available!");
      setShowPrompt(true);
    },
  });

  // 🔥 NEW: Back button closes update prompt (only if not updating)
  useBackButton(showPrompt && !updating, () => {
    handleDismiss();
  });

  useEffect(() => {
    if (needRefresh) {
      setShowPrompt(true);
    }
  }, [needRefresh]);

  const handleUpdate = async () => {
    setUpdating(true);
    try {
      await updateServiceWorker(true);
    } catch (err) {
      console.error("Update failed:", err);
      setUpdating(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setNeedRefresh(false);

    setTimeout(
      () => {
        if (needRefresh) {
          setShowPrompt(true);
        }
      },
      10 * 60 * 1000,
    );
  };

  return (
    <AnimatePresence>
      {showPrompt && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[300]"
            onClick={!updating ? handleDismiss : undefined}
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
              className="w-full max-w-sm rounded-2xl shadow-2xl pointer-events-auto overflow-hidden"
              style={{
                backgroundColor: "var(--color-bgCard)",
                border: "1px solid var(--color-border)",
              }}
            >
              <div className="relative pt-6 pb-2 px-5 text-center">
                <button
                  onClick={handleDismiss}
                  disabled={updating}
                  className="absolute top-3 right-3 p-1.5 rounded-lg transition-colors hover:bg-white/10 disabled:opacity-50"
                  style={{ color: "var(--color-textMuted)" }}
                >
                  <HiOutlineX className="text-lg" />
                </button>

                <motion.div
                  animate={{
                    rotate: updating ? 360 : 0,
                  }}
                  transition={{
                    duration: 2,
                    repeat: updating ? Infinity : 0,
                    ease: "linear",
                  }}
                  className="w-20 h-20 rounded-2xl mx-auto mb-3 flex items-center justify-center relative"
                  style={{
                    background:
                      "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primaryDark) 100%)",
                    boxShadow: "0 0 30px var(--color-glow)",
                  }}
                >
                  <HiOutlineRefresh className="text-white text-4xl" />

                  <motion.div
                    animate={{
                      scale: [1, 1.2, 1],
                      rotate: [0, 180, 360],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="absolute -top-2 -right-2"
                  >
                    <HiSparkles className="text-yellow-400 text-2xl" />
                  </motion.div>
                </motion.div>

                <h3
                  className="text-lg font-display font-semibold mb-1"
                  style={{ color: "var(--color-text)" }}
                >
                  New Update Available! 🎉
                </h3>
                <p
                  className="text-sm"
                  style={{ color: "var(--color-textMuted)" }}
                >
                  A fresh version of Talish is ready with improvements & new
                  features
                </p>
              </div>

              <div className="px-5 py-3">
                <div
                  className="p-3 rounded-xl"
                  style={{
                    backgroundColor: "var(--color-bgInput)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <p
                    className="text-xs font-semibold mb-2"
                    style={{ color: "var(--color-primary)" }}
                  >
                    ✨ What's new:
                  </p>
                  <ul
                    className="text-xs space-y-1"
                    style={{ color: "var(--color-textMuted)" }}
                  >
                    <li>• Performance improvements</li>
                    <li>• Bug fixes</li>
                    <li>• New features</li>
                  </ul>
                </div>
              </div>

              <div className="p-5 pt-2 flex flex-col gap-2">
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={handleUpdate}
                  disabled={updating}
                  className="w-full py-3 rounded-xl text-white font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-70"
                  style={{
                    background:
                      "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primaryDark) 100%)",
                    boxShadow: updating
                      ? "none"
                      : "0 4px 20px var(--color-glow)",
                  }}
                >
                  {updating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Updating...</span>
                    </>
                  ) : (
                    <>
                      <HiOutlineRefresh className="text-lg" />
                      <span>Update Now</span>
                    </>
                  )}
                </motion.button>

                <button
                  onClick={handleDismiss}
                  disabled={updating}
                  className="w-full py-2 text-xs disabled:opacity-50"
                  style={{ color: "var(--color-textMuted)" }}
                >
                  Later (will remind in 10 min)
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default UpdatePrompt;
