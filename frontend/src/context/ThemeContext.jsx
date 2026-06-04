import React, { createContext, useState, useEffect, useContext } from "react";

export const ThemeContext = createContext(null);

// ============================================
// 🌑 DARK THEMES (11 existing)
// ============================================
export const DARK_THEMES = {
  crimson: {
    name: "Crimson Night",
    emoji: "🔥",
    mode: "dark",
    primary: "#FB3640",
    primaryDark: "#D62B33",
    primaryLight: "#FD5560",
    secondary: "#FB3640",
    bg: "#000F08",
    bgCard: "#0A1F18",
    bgInput: "#142A22",
    border: "#1E3A30",
    text: "#F0F4F2",
    textMuted: "#8FA59B",
    accent: "#FB3640",
    glow: "rgba(251, 54, 64, 0.4)",
  },
  midnight: {
    name: "Midnight Purple",
    emoji: "🌌",
    mode: "dark",
    primary: "#8B5CF6",
    primaryDark: "#7C3AED",
    primaryLight: "#A78BFA",
    secondary: "#EC4899",
    bg: "#0F0A1F",
    bgCard: "#1A1530",
    bgInput: "#241D3F",
    border: "#312A4F",
    text: "#F0F4F2",
    textMuted: "#9080B0",
    accent: "#8B5CF6",
    glow: "rgba(139, 92, 246, 0.4)",
  },
  ocean: {
    name: "Deep Ocean",
    emoji: "🌊",
    mode: "dark",
    primary: "#06B6D4",
    primaryDark: "#0891B2",
    primaryLight: "#22D3EE",
    secondary: "#3B82F6",
    bg: "#001F2F",
    bgCard: "#0A2A3F",
    bgInput: "#143645",
    border: "#1F4A5F",
    text: "#F0F4F2",
    textMuted: "#7FA0B0",
    accent: "#06B6D4",
    glow: "rgba(6, 182, 212, 0.4)",
  },
  forest: {
    name: "Forest Green",
    emoji: "🌲",
    mode: "dark",
    primary: "#10B981",
    primaryDark: "#059669",
    primaryLight: "#34D399",
    secondary: "#84CC16",
    bg: "#0A1F1A",
    bgCard: "#142A24",
    bgInput: "#1E3A30",
    border: "#2A4A3F",
    text: "#F0F4F2",
    textMuted: "#7FA090",
    accent: "#10B981",
    glow: "rgba(16, 185, 129, 0.4)",
  },
  sunset: {
    name: "Sunset Glow",
    emoji: "🌅",
    mode: "dark",
    primary: "#F97316",
    primaryDark: "#EA580C",
    primaryLight: "#FB923C",
    secondary: "#F59E0B",
    bg: "#1F0F0A",
    bgCard: "#2A1815",
    bgInput: "#3A221E",
    border: "#4A2E28",
    text: "#F4EFE8",
    textMuted: "#A89080",
    accent: "#F97316",
    glow: "rgba(249, 115, 22, 0.4)",
  },
  rose: {
    name: "Rose Garden",
    emoji: "🌹",
    mode: "dark",
    primary: "#F43F5E",
    primaryDark: "#E11D48",
    primaryLight: "#FB7185",
    secondary: "#EC4899",
    bg: "#1F0A14",
    bgCard: "#2A1520",
    bgInput: "#3A1F2C",
    border: "#4A2A3A",
    text: "#F4EFE8",
    textMuted: "#A88090",
    accent: "#F43F5E",
    glow: "rgba(244, 63, 94, 0.4)",
  },
  cyber: {
    name: "Cyber Punk",
    emoji: "⚡",
    mode: "dark",
    primary: "#A3E635",
    primaryDark: "#84CC16",
    primaryLight: "#BEF264",
    secondary: "#EC4899",
    bg: "#0A0F1F",
    bgCard: "#141A2A",
    bgInput: "#1E243A",
    border: "#2A304A",
    text: "#F0F4F2",
    textMuted: "#80A090",
    accent: "#A3E635",
    glow: "rgba(163, 230, 53, 0.4)",
  },
  blood: {
    name: "Blood Moon",
    emoji: "🩸",
    mode: "dark",
    primary: "#DC2626",
    primaryDark: "#B91C1C",
    primaryLight: "#EF4444",
    secondary: "#F59E0B",
    bg: "#0F0A0A",
    bgCard: "#1F1414",
    bgInput: "#2A1E1E",
    border: "#3A2828",
    text: "#F4EFE8",
    textMuted: "#A08080",
    accent: "#DC2626",
    glow: "rgba(220, 38, 38, 0.4)",
  },
  arctic: {
    name: "Arctic Frost",
    emoji: "❄️",
    mode: "dark",
    primary: "#60A5FA",
    primaryDark: "#3B82F6",
    primaryLight: "#93C5FD",
    secondary: "#A78BFA",
    bg: "#0A1421",
    bgCard: "#141F2E",
    bgInput: "#1E2A3E",
    border: "#2A3A4F",
    text: "#F0F4F8",
    textMuted: "#809FB8",
    accent: "#60A5FA",
    glow: "rgba(96, 165, 250, 0.4)",
  },
  gold: {
    name: "Royal Gold",
    emoji: "👑",
    mode: "dark",
    primary: "#EAB308",
    primaryDark: "#CA8A04",
    primaryLight: "#FACC15",
    secondary: "#F59E0B",
    bg: "#1A1408",
    bgCard: "#241D10",
    bgInput: "#2E2618",
    border: "#3E3424",
    text: "#F4EFE0",
    textMuted: "#A89870",
    accent: "#EAB308",
    glow: "rgba(234, 179, 8, 0.4)",
  },
  neon: {
    name: "Neon Vibe",
    emoji: "💫",
    mode: "dark",
    primary: "#D946EF",
    primaryDark: "#C026D3",
    primaryLight: "#E879F9",
    secondary: "#06B6D4",
    bg: "#0A0A1F",
    bgCard: "#14142A",
    bgInput: "#1E1E3A",
    border: "#2A2A4A",
    text: "#F4EFFF",
    textMuted: "#9080B0",
    accent: "#D946EF",
    glow: "rgba(217, 70, 239, 0.4)",
  },
};

// ============================================
// 🌕 LIGHT THEMES (4 new)
// ============================================
export const LIGHT_THEMES = {
  light_clean: {
    name: "Clean White",
    emoji: "☀️",
    mode: "light",
    primary: "#7C3AED",
    primaryDark: "#6D28D9",
    primaryLight: "#8B5CF6",
    secondary: "#EC4899",
    bg: "#F8F9FA",
    bgCard: "#FFFFFF",
    bgInput: "#F1F3F5",
    border: "#E2E8F0",
    text: "#1A202C",
    textMuted: "#64748B",
    accent: "#7C3AED",
    glow: "rgba(124, 58, 237, 0.2)",
  },
  light_rose: {
    name: "Rose Light",
    emoji: "🌸",
    mode: "light",
    primary: "#E11D48",
    primaryDark: "#BE123C",
    primaryLight: "#F43F5E",
    secondary: "#EC4899",
    bg: "#FFF1F3",
    bgCard: "#FFFFFF",
    bgInput: "#FFE4E9",
    border: "#FECDD3",
    text: "#1A0A10",
    textMuted: "#9F4455",
    accent: "#E11D48",
    glow: "rgba(225, 29, 72, 0.2)",
  },
  light_ocean: {
    name: "Ocean Light",
    emoji: "🏖️",
    mode: "light",
    primary: "#0891B2",
    primaryDark: "#0E7490",
    primaryLight: "#06B6D4",
    secondary: "#3B82F6",
    bg: "#F0F9FF",
    bgCard: "#FFFFFF",
    bgInput: "#E0F2FE",
    border: "#BAE6FD",
    text: "#0C1A2A",
    textMuted: "#4A7A95",
    accent: "#0891B2",
    glow: "rgba(8, 145, 178, 0.2)",
  },
  light_forest: {
    name: "Forest Light",
    emoji: "🍃",
    mode: "light",
    primary: "#059669",
    primaryDark: "#047857",
    primaryLight: "#10B981",
    secondary: "#65A30D",
    bg: "#F0FDF4",
    bgCard: "#FFFFFF",
    bgInput: "#DCFCE7",
    border: "#BBF7D0",
    text: "#0A1F14",
    textMuted: "#4A7A5A",
    accent: "#059669",
    glow: "rgba(5, 150, 105, 0.2)",
  },
};

// ============================================
// Combined for backward compatibility
// ============================================
export const THEMES = { ...DARK_THEMES, ...LIGHT_THEMES };

export const ThemeProvider = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState(() => {
    return localStorage.getItem("talish_theme") || "crimson";
  });

  const theme = THEMES[currentTheme] || THEMES.crimson;
  const isLightMode = theme.mode === "light";

  useEffect(() => {
    const root = document.documentElement;

    // Apply all CSS variables
    Object.entries(theme).forEach(([key, value]) => {
      if (
        typeof value === "string" &&
        key !== "name" &&
        key !== "emoji" &&
        key !== "mode"
      ) {
        root.style.setProperty(`--color-${key}`, value);
      }
    });

    // 🔥 Light/dark mode class on html element
    if (isLightMode) {
      root.classList.add("light-mode");
      root.classList.remove("dark-mode");
    } else {
      root.classList.add("dark-mode");
      root.classList.remove("light-mode");
    }

    // Set body background
    document.body.style.backgroundColor = theme.bg;

    // Save to localStorage
    localStorage.setItem("talish_theme", currentTheme);
  }, [currentTheme, theme, isLightMode]);

  const changeTheme = (themeName) => {
    if (THEMES[themeName]) {
      setCurrentTheme(themeName);
    }
  };

  const cycleTheme = () => {
    const themeNames = Object.keys(THEMES);
    const currentIndex = themeNames.indexOf(currentTheme);
    const nextIndex = (currentIndex + 1) % themeNames.length;
    setCurrentTheme(themeNames[nextIndex]);
  };

  return (
    <ThemeContext.Provider
      value={{
        currentTheme,
        theme,
        themes: THEMES,
        darkThemes: DARK_THEMES,
        lightThemes: LIGHT_THEMES,
        isLightMode,
        changeTheme,
        cycleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

export default ThemeProvider;
