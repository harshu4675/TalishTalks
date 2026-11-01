import React from "react";
import { HiOutlineRefresh } from "react-icons/hi";
import { useRegisterSW } from "virtual:pwa-register/react";
const UpdatePrompt = () => {
  const { needRefresh: [needRefresh, setNeedRefresh], updateServiceWorker } = useRegisterSW({ onRegisterError(error) { console.error("Service worker registration failed:", error.message); } });
  if (!needRefresh) return null;
  return <div className="fixed left-4 right-4 bottom-5 z-[100] mx-auto max-w-md modal-panel p-4 flex items-center gap-3" role="status"><HiOutlineRefresh /><span className="flex-1 text-sm">A new version is ready. Reload when you’re ready.</span><button className="text-button" onClick={() => setNeedRefresh(false)}>Later</button><button className="button primary" onClick={() => updateServiceWorker(true)}>Reload</button></div>;
};
export default UpdatePrompt;
