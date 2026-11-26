import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// A malformed VITE_API_URL (for example "http:/localhost:5000/api") is rejected by axios
// before any request is sent, which reaches the user only as a generic authentication
// error. Validate it here so the dev server and the production build fail with a clear
// message instead, mirroring the backend's required environment variables.
const validateApiUrl = (value) => {
  const apiUrl = (value || "").trim();
  if (!apiUrl) return;
  if (apiUrl.startsWith("/")) return;
  if (!/^https?:\/\//i.test(apiUrl)) {
    throw new Error(
      `Invalid VITE_API_URL "${apiUrl}": it must start with "http://" or "https://", for example http://localhost:5000/api. Leave it empty to use the same-origin API path.`,
    );
  }
  let pathname;
  try {
    pathname = new URL(apiUrl).pathname;
  } catch {
    throw new Error(`Invalid VITE_API_URL "${apiUrl}": it is not a valid URL.`);
  }
  if (!pathname.replace(/\/+$/, "").endsWith("/api")) {
    throw new Error(
      `Invalid VITE_API_URL "${apiUrl}": it must include /api, for example http://localhost:5000/api.`,
    );
  }
};

const config = {
  plugins: [react(), VitePWA({
    registerType: "prompt", strategies: "injectManifest", srcDir: "src", filename: "sw.js", injectRegister: false,
    includeAssets: ["favicon.ico", "icon.svg", "pwa-192x192.png", "pwa-512x512.png"],
    manifest: {
      name: "Talish Talks", short_name: "TalishTalks", description: "Your conversations, connected.",
      theme_color: "#0866FF", background_color: "#F5F7FA", display: "standalone", scope: "/", start_url: "/",
      categories: ["social", "communication"],
      icons: [
        { src: "pwa-192x192.png", sizes: "192x192", type: "image/png", purpose: "any maskable" },
        { src: "pwa-512x512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
      ],
    },
    devOptions: { enabled: false },
  })],
  server: {
    port: 3000, host: "0.0.0.0", allowedHosts: [".e2b.app"],
    proxy: {
      "/api": { target: "http://127.0.0.1:5000", changeOrigin: true },
      "/socket.io": { target: "http://127.0.0.1:5000", ws: true, changeOrigin: true },
    },
  },
  preview: { port: 3000, host: "0.0.0.0", allowedHosts: [".e2b.app"] },
  build: {
    rollupOptions: { output: { manualChunks: { react: ["react", "react-dom", "react-router-dom"], realtime: ["socket.io-client"], icons: ["react-icons/hi", "react-icons/hi2", "react-icons/tb"] } } },
    chunkSizeWarningLimit: 600,
  },
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  validateApiUrl(env.VITE_API_URL);
  return config;
});
