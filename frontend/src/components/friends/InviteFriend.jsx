import Avatar from "../../components/common/Avatar";
import React, { useState, useEffect, useRef } from "react";
import { HiOutlineClipboardCopy, HiOutlineCheck, HiOutlineShare } from "react-icons/hi";
import toast from "react-hot-toast";
import Modal from "../common/Modal";
import { useAuth } from "../../hooks/useAuth";
const InviteFriend = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const appUrl = import.meta.env.VITE_APP_URL || window.location.origin;
  const message = `Join me on Talish Talks: ${appUrl}\nFind me with username: @${user?.username}`;
  const copy = async () => {
    try { await navigator.clipboard.writeText(message); setCopied(true); clearTimeout(timer.current); timer.current = setTimeout(() => setCopied(false), 2500); }
    catch { toast.error("Clipboard unavailable. Select and copy the invitation below."); }
  };
  const share = async () => { try { await navigator.share({ title: "Join me on Talish Talks", text: message, url: appUrl }); } catch (error) { if (error.name !== "AbortError") toast.error("Sharing is unavailable. Copy the invitation instead."); } };
  return <Modal isOpen={isOpen} onClose={onClose} title="Invite a friend" description="Share your username so friends can find you."><div className="modal-body space-y-4">
    <div className="settings-row"><Avatar className="w-11 h-11 rounded-full object-cover" src={user?.avatar} alt="" /><div><strong>{user?.fullName}</strong><p>@{user?.username}</p></div></div>
    <textarea className="input text-sm" aria-label="Invitation text" readOnly rows={4} value={message} onFocus={(event) => event.target.select()} />
    <button className="button primary w-full" onClick={copy}>{copied ? <HiOutlineCheck /> : <HiOutlineClipboardCopy />}{copied ? "Copied" : "Copy invitation"}</button>
    <div className="grid grid-cols-2 gap-2"><button className="button secondary" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer")}>WhatsApp</button><button className="button secondary" onClick={() => window.open(`https://t.me/share/url?url=${encodeURIComponent(appUrl)}&text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer")}>Telegram</button></div>
    {typeof navigator.share === "function" && <button className="button secondary w-full" onClick={share}><HiOutlineShare /> More sharing options</button>}
  </div></Modal>;
};
export default InviteFriend;
