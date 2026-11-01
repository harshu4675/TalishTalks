import React from "react";
import { HiChatAlt2 } from "react-icons/hi";
const TalishLogo = ({ size = "md", showText = true, className = "" }) => <div className={`talish-logo ${className}`}><span className={`talish-mark ${size === "lg" || size === "xl" ? "!w-14 !h-14" : ""}`}><HiChatAlt2 /></span>{showText && <span className="brand-name">Talish<span>Talks</span></span>}</div>;
export const TalishLogoMini = ({ className }) => <TalishLogo size="sm" showText={false} className={className} />;
export const TalishLogoText = ({ className = "" }) => <span className={`brand-name ${className}`}>Talish<span>Talks</span></span>;
export default TalishLogo;
