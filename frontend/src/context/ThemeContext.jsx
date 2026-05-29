import React, { createContext, useState, useEffect, useContext } from "react";

export const ThemeContext = createContext(null);

// 11 Theme Combinations (Your custom is default)
export const THEMES = {
  crimson: {
    name: "Crimson Night",
    emoji: "🔥",
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

export const ThemeProvider = ({ children }) => {
  // Get saved theme or default to 'crimson' (your custom theme)
  const [currentTheme, setCurrentTheme] = useState(() => {
    return localStorage.getItem("talish_theme") || "crimson";
  });

  const theme = THEMES[currentTheme] || THEMES.crimson;

  // Apply theme CSS variables to document
  useEffect(() => {
    const root = document.documentElement;
    Object.entries(theme).forEach(([key, value]) => {
      if (typeof value === "string" && key !== "name" && key !== "emoji") {
        root.style.setProperty(`--color-${key}`, value);
      }
    });

    // Set body background
    document.body.style.backgroundColor = theme.bg;

    // Save to localStorage
    localStorage.setItem("talish_theme", currentTheme);
  }, [currentTheme, theme]);

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
