import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HiOutlineColorSwatch, HiCheck } from "react-icons/hi";
import { useTheme, THEMES } from "../../context/ThemeContext";

const ThemeSwitcher = () => {
  const { currentTheme, changeTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg transition-colors relative group"
        style={{
          color: "var(--color-textMuted)",
        }}
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

      {/* Dropdown Panel */}
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
                  className="text-xs mt-1"
                  style={{ color: "var(--color-textMuted)" }}
                >
                  Pick your vibe ✨
                </p>
              </div>

              {/* Theme Grid */}
              <div className="p-3 max-h-96 overflow-y-auto scrollbar-thin">
                <div className="grid grid-cols-1 gap-2">
                  {Object.entries(THEMES).map(([key, themeData]) => {
                    const isActive = currentTheme === key;
                    return (
                      <button
                        key={key}
                        onClick={() => {
                          changeTheme(key);
                          setIsOpen(false);
                        }}
                        className="flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group"
                        style={{
                          backgroundColor: isActive
                            ? "var(--color-bgInput)"
                            : "transparent",
                          border: isActive
                            ? `1px solid ${themeData.primary}`
                            : "1px solid transparent",
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive) {
                            e.currentTarget.style.backgroundColor =
                              "var(--color-bgInput)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive) {
                            e.currentTarget.style.backgroundColor =
                              "transparent";
                          }
                        }}
                      >
                        {/* Color Preview */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <div
                            className="w-8 h-8 rounded-lg shadow-lg"
                            style={{
                              background: `linear-gradient(135deg, ${themeData.primary} 0%, ${themeData.secondary} 100%)`,
                            }}
                          />
                          <div
                            className="w-8 h-8 rounded-lg"
                            style={{ backgroundColor: themeData.bg }}
                          />
                        </div>

                        {/* Theme Info */}
                        <div className="flex-1 text-left">
                          <p
                            className="text-sm font-medium flex items-center gap-1.5"
                            style={{ color: "var(--color-text)" }}
                          >
                            <span>{themeData.emoji}</span>
                            {themeData.name}
                          </p>
                          <p
                            className="text-xs"
                            style={{ color: "var(--color-textMuted)" }}
                          >
                            {themeData.primary} • {themeData.bg}
                          </p>
                        </div>

                        {/* Active Indicator */}
                        {isActive && (
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{
                              backgroundColor: themeData.primary,
                              boxShadow: `0 0 10px ${themeData.primary}`,
                            }}
                          >
                            <HiCheck className="text-white text-sm" />
                          </div>
                        )}
                      </button>
                    );
                  })}
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
                  💡 Theme syncs across sessions
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
