import React, { useState, useEffect, useCallback } from "react";
import { PWAContext } from "./pwaContext";
export const PWAProvider = ({ children }) => {
  const [prompt, setPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(() => window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true);
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    const beforeInstall = (event) => { event.preventDefault(); setPrompt(event); setDismissed(false); };
    const installed = () => { setIsInstalled(true); setPrompt(null); };
    const media = window.matchMedia("(display-mode: standalone)");
    const changed = () => setIsInstalled(media.matches || navigator.standalone === true);
    window.addEventListener("beforeinstallprompt", beforeInstall); window.addEventListener("appinstalled", installed); media.addEventListener("change", changed);
    return () => { window.removeEventListener("beforeinstallprompt", beforeInstall); window.removeEventListener("appinstalled", installed); media.removeEventListener("change", changed); };
  }, []);
  const installApp = useCallback(async () => {
    if (!prompt) return { outcome: "unavailable", message: "Open your browser’s Share or menu, then choose Add to Home Screen or Install app." };
    try { await prompt.prompt(); const choice = await prompt.userChoice; setPrompt(null); return choice; }
    catch { setPrompt(null); return { outcome: "unavailable", message: "Use your browser’s menu to install Talish Talks." }; }
  }, [prompt]);
  return <PWAContext.Provider value={{ isInstallable: !!prompt && !dismissed, isInstalled, installApp, dismissInstallPrompt: () => setDismissed(true) }}>{children}</PWAContext.Provider>;
};
export default PWAProvider;
