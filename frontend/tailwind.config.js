/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: "var(--color-primary)",
        canvas: "var(--color-bg)",
        surface: "var(--color-bgCard)",
        input: "var(--color-bgInput)",
        line: "var(--color-border)",
        ink: "var(--color-text)",
        muted: "var(--color-textMuted)",

      },
      fontFamily: { sans: ["-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "Helvetica", "Arial", "sans-serif"], display: ["-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"] },
      boxShadow: { card: "0 2px 8px rgb(28 30 33 / 5%)", "card-hover": "0 8px 28px rgb(28 30 33 / 10%)" },
    },
  },
  plugins: [],
};
