import React, { useEffect } from "react";
import TalishLogo from "../../assets/logo";
const LoadingScreen = () => {
  useEffect(() => { const loader = document.getElementById("initial-loader"); if (loader) loader.hidden = true; }, []);
  return <div className="empty-state h-full" role="status"><TalishLogo size="lg" /><span className="spinner mt-5" /><p>Checking your session…</p></div>;
};
export default LoadingScreen;
