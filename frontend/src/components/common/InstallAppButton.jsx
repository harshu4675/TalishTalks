import React from "react";
import { HiOutlineDeviceMobile, HiOutlineDownload, HiOutlineCheck } from "react-icons/hi";
import toast from "react-hot-toast";
import { usePWA } from "../../hooks/usePWA";
const InstallAppButton = ({ variant = "default" }) => {
  const { isInstallable, isInstalled, installApp } = usePWA();
  const install = async () => {
    const result = await installApp();
    if (result.outcome === "accepted") toast.success("Talish Talks installed");
    else if (result.outcome === "dismissed") toast("Installation cancelled");
    else if (result.message) toast(result.message, { icon: <HiOutlineDeviceMobile /> });
  };
  if (isInstalled) return <div className="settings-row"><HiOutlineCheck /><div><strong>App installed</strong><p>Talish Talks is ready on this device.</p></div></div>;
  if (variant === "compact") return <button className="icon-button" title={isInstallable ? "Install app" : "How to install"} aria-label="Install app" onClick={install}><HiOutlineDownload /></button>;
  return <div className="settings-row"><HiOutlineDeviceMobile /><div><strong>{isInstallable ? "Install Talish Talks" : "Add to your home screen"}</strong><p>{isInstallable ? "Quick access to your conversations." : "Use your browser’s Share or menu, then Add to Home Screen."}</p></div><button className="button secondary" onClick={install}>{isInstallable ? "Install" : "How to"}</button></div>;
};
export default InstallAppButton;
