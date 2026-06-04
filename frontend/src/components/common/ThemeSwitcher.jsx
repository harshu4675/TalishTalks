import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { HiOutlineColorSwatch, HiCheck } from "react-icons/hi";
import {
  useTheme,
  DARK_THEMES,
  LIGHT_THEMES,
} from "../../context/ThemeContext";

const ThemeSwitcher = () => {
  const { currentTheme, changeTheme, isLightMode } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef(null);

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const dropdownWidth = 288;
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      const padding = 12;

      let left = rect.right - dropdownWidth;
      if (left < padding) left = padding;
      if (left + dropdownWidth > windowWidth - padding)
        left = windowWidth - dropdownWidth - padding;

      let top = rect.bottom + 8;
      const dropdownMaxHeight = Math.min(windowHeight * 0.8, 600);
      if (top + dropdownMaxHeight > windowHeight - padding) {
        top = Math.max(padding, rect.top - dropdownMaxHeight - 8);
      }

      setPosition({ top, left });
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClose = () => setIsOpen(false);
    window.addEventListener("scroll", handleClose, true);
    window.addEventListener("resize", handleClose);
    return () => {
      window.removeEventListener("scroll", handleClose, true);
      window.removeEventListener("resize", handleClose);
    };
  }, [isOpen]);

  const ThemeButton = ({ themeKey, themeData }) => {
    const isActive = currentTheme === themeKey;
    return (
      <button
        onClick={() => {
          changeTheme(themeKey);
          setIsOpen(false);
        }}
        className="flex items-center gap-3 p-2.5 rounded-xl transition-all duration-200 w-full"
        style={{
          backgroundColor: isActive ? "var(--color-bgInput)" : "transparent",
          border: isActive
            ? `1px solid ${themeData.primary}`
            : "1px solid transparent",
        }}
        onMouseEnter={(e) => {
          if (!isActive)
            e.currentTarget.style.backgroundColor = "var(--color-bgInput)";
        }}
        onMouseLeave={(e) => {
          if (!isActive) e.currentTarget.style.backgroundColor = "transparent";
        }}
      >
        <div className="flex items-center gap-1 flex-shrink-0">
          <div
            className="w-7 h-7 rounded-lg shadow-sm"
            style={{
              background: `linear-gradient(135deg, ${themeData.primary} 0%, ${themeData.secondary} 100%)`,
            }}
          />
          <div
            className="w-7 h-7 rounded-lg"
            style={{
              backgroundColor: themeData.bg,
              border: `1px solid ${themeData.border}`,
            }}
          />
        </div>

        <div className="flex-1 text-left min-w-0">
          <p
            className="text-sm font-medium truncate"
            style={{ color: "var(--color-text)" }}
          >
            {themeData.emoji} {themeData.name}
          </p>
          <p
            className="text-[10px] truncate"
            style={{ color: "var(--color-textMuted)" }}
          >
            {themeData.primary}
          </p>
        </div>

        {isActive && (
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
            style={{
              backgroundColor: themeData.primary,
              boxShadow: `0 0 8px ${themeData.glow}`,
            }}
          >
            <HiCheck className="text-white text-xs" />
          </div>
        )}
      </button>
    );
  };

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg transition-colors relative group"
        style={{ color: "var(--color-textMuted)" }}
        title="Change Theme"
      >
        <HiOutlineColorSwatch className="text-lg group-hover:scale-110 transition-transform" />
        <div
          className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2"
          style={{
            backgroundColor: "var(--color-primary)",
            borderColor: "var(--color-bg)",
          }}
        />
      </button>

      {isOpen &&
        createPortal(
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-[9998] bg-black/20"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -5 }}
              transition={{ duration: 0.15 }}
              className="fixed w-72 rounded-2xl shadow-card-hover z-[9999] flex flex-col"
              style={{
                top: `${position.top}px`,
                left: `${position.left}px`,
                backgroundColor: "var(--color-bgCard)",
                border: "1px solid var(--color-border)",
                maxWidth: "calc(100vw - 24px)",
                maxHeight: "min(80vh, 600px)",
              }}
            >
              {/* Header */}
              <div
                className="p-4 border-b flex-shrink-0"
                style={{ borderColor: "var(--color-border)" }}
              >
                <h3
                  className="text-sm font-semibold flex items-center gap-2"
                  style={{ color: "var(--color-text)" }}
                >
                  <HiOutlineColorSwatch className="text-base" />
                  Choose Theme
                </h3>
                <p
                  className="text-xs mt-0.5"
                  style={{ color: "var(--color-textMuted)" }}
                >
                  {isLightMode ? "☀️ Light mode active" : "🌙 Dark mode active"}
                </p>
              </div>

              {/* Scrollable list */}
              <div
                className="overflow-y-auto scrollbar-thin p-3 space-y-4 flex-1 min-h-0"
                style={{
                  WebkitOverflowScrolling: "touch",
                  overscrollBehavior: "contain",
                  touchAction: "pan-y",
                }}
              >
                {/* Dark themes */}
                <div>
                  <p
                    className="text-[10px] font-semibold uppercase tracking-widest mb-2 px-1"
                    style={{ color: "var(--color-textMuted)" }}
                  >
                    🌙 Dark Themes
                  </p>
                  <div className="space-y-1">
                    {Object.entries(DARK_THEMES).map(([key, themeData]) => (
                      <ThemeButton
                        key={key}
                        themeKey={key}
                        themeData={themeData}
                      />
                    ))}
                  </div>
                </div>

                <div
                  className="border-t"
                  style={{ borderColor: "var(--color-border)" }}
                />

                {/* Light themes */}
                <div>
                  <p
                    className="text-[10px] font-semibold uppercase tracking-widest mb-2 px-1"
                    style={{ color: "var(--color-textMuted)" }}
                  >
                    ☀️ Light Themes
                  </p>
                  <div className="space-y-1">
                    {Object.entries(LIGHT_THEMES).map(([key, themeData]) => (
                      <ThemeButton
                        key={key}
                        themeKey={key}
                        themeData={themeData}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div
                className="px-4 py-3 border-t text-center flex-shrink-0"
                style={{
                  borderColor: "var(--color-border)",
                  backgroundColor: "var(--color-bg)",
                }}
              >
                <p
                  className="text-xs"
                  style={{ color: "var(--color-textMuted)" }}
                >
                  💡{" "}
                  {Object.keys(DARK_THEMES).length +
                    Object.keys(LIGHT_THEMES).length}{" "}
                  themes available
                </p>
              </div>
            </motion.div>
          </>,
          document.body,
        )}
    </>
  );
};

export default ThemeSwitcher;
