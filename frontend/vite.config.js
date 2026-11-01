import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
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
});
