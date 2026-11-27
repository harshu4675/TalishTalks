import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

/**
 * Validate the API base URL before the dev server or the production build
 * starts.
 *
 * A malformed VITE_API_URL (for example "http:/localhost:5000/api") is rejected
 * by axios before any request is sent, which reaches the user only as a
 * generic authentication error. Failing here turns that into an actionable
 * message on the console.
 */
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

/**
 * Validate the socket origin. The socket connects to an origin, so it must be
 * an absolute URL - or left empty to reuse the origin of VITE_API_URL.
 */
const validateSocketUrl = (value) => {
  const socketUrl = (value || "").trim();
  if (!socketUrl) return;
  if (!/^https?:\/\//i.test(socketUrl)) {
    throw new Error(
      `Invalid VITE_SOCKET_URL "${socketUrl}": it must start with "http://" or "https://", for example https://talish.example.com.`,
    );
  }
  try {
    new URL(socketUrl);
  } catch {
    throw new Error(`Invalid VITE_SOCKET_URL "${socketUrl}": it is not a valid URL.`);
  }
};

/**
 * The dev server and the preview server both talk to a backend on port 5000.
 * Sharing the proxy definition keeps `npm run preview` a faithful local
 * rehearsal of a same-origin production deployment.
 */
const apiProxy = {
  "/api": { target: "http://127.0.0.1:5000", changeOrigin: true },
  "/socket.io": { target: "http://127.0.0.1:5000", ws: true, changeOrigin: true },
};

const config = {
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.js",
      injectRegister: false,
      includeAssets: ["favicon.ico", "icon.svg", "pwa-192x192.png", "pwa-512x512.png"],
      manifest: {
        name: "Talish Talks",
        short_name: "TalishTalks",
        description: "Your conversations, connected.",
        theme_color: "#FFFFFF",
        background_color: "#FFFFFF",
        display: "standalone",
        scope: "/",
        start_url: "/",
        categories: ["social", "communication"],
        icons: [
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png", purpose: "any maskable" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  server: {
    port: 3000,
    host: "0.0.0.0",
    allowedHosts: [".e2b.app"],
    proxy: apiProxy,
  },
  preview: {
    port: 3000,
    host: "0.0.0.0",
    allowedHosts: [".e2b.app"],
    proxy: apiProxy,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          realtime: ["socket.io-client"],
          icons: ["react-icons/fi", "react-icons/hi", "react-icons/hi2", "react-icons/tb"],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  validateApiUrl(env.VITE_API_URL);
  validateSocketUrl(env.VITE_SOCKET_URL);
  return config;
});
