import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HiOutlineDownload,
  HiOutlineX,
  HiOutlineCheck,
  HiOutlineDotsVertical,
  HiOutlinePlus,
} from "react-icons/hi";
import toast from "react-hot-toast";
import { usePWA } from "../../context/PWAContext";

const InstallAppButton = ({ variant = "button", className = "" }) => {
  const { isInstallable, isInstalled, installPWA } = usePWA();
  const [showHelp, setShowHelp] = useState(false);

  // Detect browser/platform
  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isAndroid = /Android/.test(navigator.userAgent);
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  const isFirefox = /Firefox/.test(navigator.userAgent);
  const isSamsung = /SamsungBrowser/.test(navigator.userAgent);

  if (isInstalled) {
    if (variant === "card") {
      return (
        <div
          className={`p-3 rounded-xl flex items-center gap-3 ${className}`}
          style={{
            backgroundColor: "var(--color-bgInput)",
            border: "1px solid var(--color-border)",
          }}
        >
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: "#22c55e" }}
          >
            <HiOutlineCheck className="text-white text-xl" />
          </div>
          <div>
            <p
              className="text-sm font-semibold"
              style={{ color: "var(--color-text)" }}
            >
              App Installed ✓
            </p>
            <p className="text-xs" style={{ color: "var(--color-textMuted)" }}>
              You're using the installed version
            </p>
          </div>
        </div>
      );
    }
    return null;
  }

  const handleInstall = async () => {
    // 🔥 If auto-install available, use it
    if (isInstallable) {
      const result = await installPWA();
      if (result.success) {
        toast.success("App installed successfully! 🎉");
      } else if (result.reason === "dismissed") {
        toast("Install cancelled", { icon: "ℹ️" });
      }
      return;
    }

    // 🔥 Otherwise show manual instructions
    setShowHelp(true);
  };

  // Get appropriate instructions based on browser
  const getInstructions = () => {
    if (isIOS && isSafari) {
      return {
        title: "Install on iPhone/iPad",
        steps: [
          {
            icon: "⎘",
            text: "Tap the Share button at the bottom of Safari",
          },
          {
            icon: "➕",
            text: "Scroll down and tap 'Add to Home Screen'",
          },
          {
            icon: "✓",
            text: "Tap 'Add' in the top-right corner",
          },
        ],
      };
    }

    if (isAndroid) {
      return {
        title: "Install on Android",
        steps: [
          {
            icon: "⋮",
            text: "Tap the 3-dot menu in the top right",
          },
          {
            icon: "📱",
            text: "Tap 'Install app' or 'Add to Home screen'",
          },
          {
            icon: "✓",
            text: "Tap 'Install' to confirm",
          },
        ],
      };
    }

    if (isSamsung) {
      return {
        title: "Install on Samsung Browser",
        steps: [
          {
            icon: "≡",
            text: "Tap the menu icon at the bottom",
          },
          {
            icon: "📱",
            text: "Tap 'Add page to' → 'Home screen'",
          },
          {
            icon: "✓",
            text: "Tap 'Add' to install",
          },
        ],
      };
    }

    if (isFirefox) {
      return {
        title: "Install on Firefox",
        steps: [
          {
            icon: "⋮",
            text: "Tap the 3-dot menu",
          },
          {
            icon: "🏠",
            text: "Tap 'Install' or 'Add to Home screen'",
          },
        ],
      };
    }

    // Default desktop
    return {
      title: "Install Talish App",
      steps: [
        {
          icon: "🔍",
          text: "Look for the install icon (⊕) in your address bar",
        },
        {
          icon: "👆",
          text: "Click it and select 'Install'",
        },
        {
          icon: "🎉",
          text: "Use Talish like a native app!",
        },
      ],
    };
  };

  const instructions = getInstructions();

  // ===== CARD VARIANT =====
  if (variant === "card") {
    return (
      <>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleInstall}
          className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all ${className}`}
          style={{
            background:
              "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primaryDark) 100%)",
          }}
        >
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-white/20">
            <HiOutlineDownload className="text-white text-xl" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold text-white">Install App</p>
            <p className="text-xs text-white/80">
              Get notifications & offline access
            </p>
          </div>
        </motion.button>

        {/* Install Instructions Modal */}
        <AnimatePresence>
          {showHelp && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowHelp(false)}
                className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[300]"
              />
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="fixed inset-0 z-[301] flex items-center justify-center p-4"
                onClick={() => setShowHelp(false)}
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="w-full max-w-sm rounded-2xl overflow-hidden"
                  style={{
                    backgroundColor: "var(--color-bgCard)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  {/* Header */}
                  <div
                    className="p-5 border-b flex items-center justify-between"
                    style={{ borderColor: "var(--color-border)" }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{
                          background:
                            "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primaryDark) 100%)",
                        }}
                      >
                        <HiOutlineDownload className="text-white text-lg" />
                      </div>
                      <h3
                        className="font-semibold text-base"
                        style={{ color: "var(--color-text)" }}
                      >
                        {instructions.title}
                      </h3>
                    </div>
                    <button
                      onClick={() => setShowHelp(false)}
                      className="p-1 rounded-lg"
                      style={{ color: "var(--color-textMuted)" }}
                    >
                      <HiOutlineX className="text-lg" />
                    </button>
                  </div>

                  {/* Steps */}
                  <div className="p-5">
                    <p
                      className="text-xs mb-4"
                      style={{ color: "var(--color-textMuted)" }}
                    >
                      Follow these steps to install the app on your device:
                    </p>

                    <div className="space-y-3">
                      {instructions.steps.map((step, index) => (
                        <div
                          key={index}
                          className="flex items-start gap-3 p-3 rounded-xl"
                          style={{
                            backgroundColor: "var(--color-bgInput)",
                          }}
                        >
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-bold"
                            style={{
                              backgroundColor: "var(--color-primary)",
                              color: "white",
                            }}
                          >
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <p
                              className="text-sm"
                              style={{ color: "var(--color-text)" }}
                            >
                              <span className="text-lg mr-2">{step.icon}</span>
                              {step.text}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Helpful tip */}
                    <div
                      className="mt-4 p-3 rounded-xl text-xs"
                      style={{
                        backgroundColor: "rgba(124, 58, 237, 0.1)",
                        border: "1px solid var(--color-primary)",
                        color: "var(--color-text)",
                      }}
                    >
                      💡 <strong>Tip:</strong>{" "}
                      {isIOS
                        ? "Once installed, the app opens like a native iOS app from your home screen!"
                        : "After installing, you can use the app offline and get push notifications!"}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="p-5 pt-0">
                    <button
                      onClick={() => setShowHelp(false)}
                      className="w-full py-2.5 rounded-xl text-white font-medium"
                      style={{
                        background:
                          "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primaryDark) 100%)",
                      }}
                    >
                      Got it!
                    </button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </>
    );
  }

  // ===== ICON VARIANT =====
  if (variant === "icon") {
    return (
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={handleInstall}
        className={`p-2 rounded-lg transition-colors hover:bg-black/20 ${className}`}
        style={{ color: "var(--color-textMuted)" }}
        title="Install App"
      >
        <HiOutlineDownload className="text-lg" />
      </motion.button>
    );
  }

  // ===== DEFAULT BUTTON =====
  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={handleInstall}
      className={`px-4 py-2 rounded-lg text-white text-sm font-medium flex items-center gap-2 transition-all ${className}`}
      style={{
        background:
          "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primaryDark) 100%)",
      }}
    >
      <HiOutlineDownload className="text-lg" />
      Install App
    </motion.button>
  );
};

export default InstallAppButton;
