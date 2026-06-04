import React, { useState } from "react";
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
        {/* Color preview dots */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <div
            className="w-7 h-7 rounded-lg shadow-sm"
            style={{
              background: `linear-gradient(135deg, ${themeData.primary} 0%, ${themeData.secondary} 100%)`,
            }}
          />
          <div
            className="w-7 h-7 rounded-lg border"
            style={{
              backgroundColor: themeData.bg,
              borderColor: themeData.border,
            }}
          />
        </div>

        {/* Theme info */}
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

        {/* Active check */}
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
    <div className="relative">
      {/* Trigger Button */}
      <button
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

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <>
            <div
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-40"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -5 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 z-50 w-72 rounded-2xl shadow-card-hover overflow-hidden"
              style={{
                backgroundColor: "var(--color-bgCard)",
                border: "1px solid var(--color-border)",
              }}
            >
              {/* Header */}
              <div
                className="p-4 border-b"
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
              <div className="max-h-[420px] overflow-y-auto scrollbar-thin p-3 space-y-4">
                {/* 🌑 Dark themes section */}
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

                {/* Divider */}
                <div
                  className="border-t"
                  style={{ borderColor: "var(--color-border)" }}
                />

                {/* ☀️ Light themes section */}
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
                className="px-4 py-3 border-t text-center"
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
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ThemeSwitcher;
