/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Dynamic theme colors (controlled by ThemeContext)
        theme: {
          primary: "var(--color-primary)",
          "primary-dark": "var(--color-primaryDark)",
          "primary-light": "var(--color-primaryLight)",
          secondary: "var(--color-secondary)",
          bg: "var(--color-bg)",
          "bg-card": "var(--color-bgCard)",
          "bg-input": "var(--color-bgInput)",
          border: "var(--color-border)",
          text: "var(--color-text)",
          "text-muted": "var(--color-textMuted)",
          accent: "var(--color-accent)",
        },
        // Keep original colors as fallback
        dark: {
          DEFAULT: "var(--color-bg)",
          50: "var(--color-bgCard)",
          100: "var(--color-bgInput)",
          200: "var(--color-border)",
          300: "#4A4A4A",
        },
        gray: {
          soft: "var(--color-textMuted)",
          light: "#B0B0B0",
          muted: "#6A6A6A",
        },
        offwhite: "var(--color-text)",
        accent: {
          DEFAULT: "var(--color-primary)",
          light: "var(--color-primaryLight)",
          dark: "var(--color-primaryDark)",
          amber: "var(--color-secondary)",
          blue: "#4A7CFF",
          glow: "var(--color-glow)",
        },
        brown: {
          deep: "#3D2B1F",
          warm: "#5C3D2E",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Space Grotesk", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-in-out",
        "fade-up": "fadeUp 0.5s ease-out",
        "slide-in-left": "slideInLeft 0.3s ease-out",
        "slide-in-right": "slideInRight 0.3s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
        "scale-in": "scaleIn 0.3s ease-out",
        "bounce-soft": "bounceSoft 0.6s ease-in-out",
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
        "spin-slow": "spin 3s linear infinite",
        "gradient-shift": "gradientShift 3s ease infinite",
        typing: "typing 1.5s ease-in-out infinite",
        float: "float 3s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInLeft: {
          "0%": { opacity: "0", transform: "translateX(-20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translateX(20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.9)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        bounceSoft: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-5px)" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 5px var(--color-glow)" },
          "50%": { boxShadow: "0 0 20px var(--color-glow)" },
        },
        gradientShift: {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
        typing: {
          "0%": { opacity: "0.3" },
          "50%": { opacity: "1" },
          "100%": { opacity: "0.3" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
      boxShadow: {
        glow: "0 0 15px var(--color-glow)",
        "glow-lg": "0 0 30px var(--color-glow)",
        card: "0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)",
        "card-hover":
          "0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)",
      },
      backgroundImage: {
        "gradient-accent":
          "linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)",
        "gradient-dark":
          "linear-gradient(180deg, var(--color-bg) 0%, var(--color-bgCard) 100%)",
        "gradient-card":
          "linear-gradient(145deg, var(--color-bgCard) 0%, var(--color-bgInput) 100%)",
      },
    },
  },
  plugins: [],
};
