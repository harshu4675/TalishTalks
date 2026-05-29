import React, { createContext, useContext, useState, useEffect } from "react";

const PWAContext = createContext(null);

export const PWAProvider = ({ children }) => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    const checkInstalled = () => {
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        window.navigator.standalone === true;
      setIsInstalled(standalone);
    };
    checkInstalled();

    // Capture install prompt (ONCE, globally)
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
      console.log("✅ PWA install prompt captured globally");
    };

    // Handle successful install
    const handleInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      console.log("🎉 PWA installed!");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleInstalled);

    // Listen for display mode changes
    const mql = window.matchMedia("(display-mode: standalone)");
    mql.addEventListener("change", checkInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleInstalled);
      mql.removeEventListener("change", checkInstalled);
    };
  }, []);

  const installPWA = async () => {
    if (!deferredPrompt) {
      return { success: false, reason: "not_available" };
    }

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      setIsInstallable(false);
      return { success: outcome === "accepted", reason: outcome };
    } catch (err) {
      console.error("Install error:", err);
      return { success: false, reason: "error" };
    }
  };

  return (
    <PWAContext.Provider
      value={{ isInstallable, isInstalled, installPWA, deferredPrompt }}
    >
      {children}
    </PWAContext.Provider>
  );
};

export const usePWA = () => {
  const context = useContext(PWAContext);
  if (!context) {
    throw new Error("usePWA must be used within PWAProvider");
  }
  return context;
};

export default PWAProvider;
