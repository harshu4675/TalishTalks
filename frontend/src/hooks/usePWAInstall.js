import { useState, useEffect } from "react";

export const usePWAInstall = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    // Check if already installed (running as PWA)
    const checkInstalled = () => {
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        window.navigator.standalone === true;
      setIsInstalled(standalone);
    };

    checkInstalled();

    // Listen for install prompt
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
      console.log("✅ PWA install prompt ready");
    };

    // Listen for successful install
    const installedHandler = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      console.log("🎉 PWA installed!");
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const installPWA = async () => {
    if (!deferredPrompt) {
      // Browser doesn't support or already installed
      return { success: false, reason: "not_available" };
    }

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      setIsInstallable(false);

      return {
        success: outcome === "accepted",
        reason: outcome,
      };
    } catch (err) {
      console.error("Install error:", err);
      return { success: false, reason: "error" };
    }
  };

  return {
    isInstallable,
    isInstalled,
    installPWA,
  };
};

export default usePWAInstall;
