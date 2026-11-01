import React, { useEffect, useState } from "react";
import { HiOutlineUser } from "react-icons/hi";
const Avatar = ({ src, name = "", className = "", ...props }) => {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  if (!src || failed) return <span className={`avatar-fallback ${className}`} role={name ? "img" : undefined} aria-label={name || undefined}><HiOutlineUser /></span>;
  return <img {...props} className={className} src={src} alt={props.alt ?? (name ? `${name}'s profile photo` : "")} onError={() => setFailed(true)} />;
};
export default Avatar;
