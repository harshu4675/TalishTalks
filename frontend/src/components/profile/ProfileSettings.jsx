import Avatar from "../../components/common/Avatar";
import React, { useState, useEffect, useRef } from "react";
import { HiOutlineCamera, HiOutlineUser, HiOutlineBan, HiOutlineLogout } from "react-icons/hi";
import toast from "react-hot-toast";
import Modal from "../common/Modal";
import SiteLockToggle from "../common/SiteLockToggle";
import NotificationToggle from "../common/NotificationToggle";
import InstallAppButton from "../common/InstallAppButton";
import { useAuth } from "../../hooks/useAuth";
import { useChat } from "../../hooks/useChat";
import { userAPI } from "../../services/api";
import { errorMessage } from "../../utils/messages";

const ProfileSettings = ({ isOpen, onClose }) => {
  const { user, updateUser, logout } = useAuth();
  const { fetchChats } = useChat();
  const [fullName, setFullName] = useState(""), [about, setAbout] = useState("");
  const [avatar, setAvatar] = useState(""), [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false), [progress, setProgress] = useState(0);
  const [blocked, setBlocked] = useState([]), [blockedError, setBlockedError] = useState("");
  const [loadingBlocked, setLoadingBlocked] = useState(false), [unblocking, setUnblocking] = useState(null);
  const initialUser = useRef(user);
  initialUser.current = user;
  const fileRef = useRef(null), previewRef = useRef(null), controllerRef = useRef(null);
  const loadBlocked = async () => {
    setLoadingBlocked(true); setBlockedError("");
    try { const response = await userAPI.getBlocked(); setBlocked(response.data.blockedUsers); }
    catch (error) { setBlockedError(errorMessage(error)); }
    finally { setLoadingBlocked(false); }
  };
  useEffect(() => {
    if (isOpen) { setFullName(initialUser.current?.fullName || ""); setAbout(initialUser.current?.about || ""); setAvatar(initialUser.current?.avatar || ""); void loadBlocked(); }
    return () => controllerRef.current?.abort();
  }, [isOpen, user?._id]);
  useEffect(() => () => { if (previewRef.current) URL.revokeObjectURL(previewRef.current); }, []);
  const save = async (event) => {
    event.preventDefault(); setBusy(true);
    try { const response = await userAPI.updateProfile({ fullName: fullName.trim(), about: about.trim() }); updateUser(response.data.user); toast.success("Profile updated"); }
    catch (error) { toast.error(errorMessage(error)); }
    finally { setBusy(false); }
  };
  const upload = async (event) => {
    const file = event.target.files?.[0]; event.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type) || file.size > 5 * 1024 * 1024) { toast.error("Choose a JPG, PNG, WebP or GIF image under 5 MB."); return; }
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = URL.createObjectURL(file); setAvatar(previewRef.current); setUploading(true);
    controllerRef.current = new AbortController();
    const form = new FormData(); form.append("avatar", file);
    try { const response = await userAPI.uploadAvatar(form, setProgress, { signal: controllerRef.current.signal, timeout: 60000 }); setAvatar(response.data.avatar); updateUser({ avatar: response.data.avatar }); toast.success("Profile photo updated"); }
    catch (error) { setAvatar(user?.avatar || ""); toast.error(errorMessage(error, "Photo upload failed.")); }
    finally { setUploading(false); URL.revokeObjectURL(previewRef.current); previewRef.current = null; }
  };
  const unblock = async (contact) => {
    setUnblocking(contact._id);
    try { await userAPI.unblock(contact._id); setBlocked((previous) => previous.filter((item) => item._id !== contact._id)); await fetchChats(); toast.success("Contact unblocked"); }
    catch (error) { toast.error(errorMessage(error)); }
    finally { setUnblocking(null); }
  };
  return <Modal isOpen={isOpen} onClose={onClose} title="Profile & settings" closeDisabled={busy || uploading}>
    <div className="modal-body">
      <div className="flex items-center gap-4 mb-5"><Avatar className="settings-avatar" src={avatar || user?.avatar} alt="Your profile" /><div><strong>{user?.fullName}</strong><p className="muted text-xs mt-1">@{user?.username}</p><button className="text-button" disabled={uploading} onClick={() => fileRef.current?.click()}><HiOutlineCamera />{uploading ? `Uploading ${progress}%` : "Change photo"}</button><input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={upload} /></div></div>
      <form onSubmit={save} className="space-y-4"><label className="field-label">Display name<input className="input" minLength={2} maxLength={50} value={fullName} onChange={(event) => setFullName(event.target.value)} required /></label><label className="field-label">About<textarea className="input" rows={2} maxLength={150} value={about} onChange={(event) => setAbout(event.target.value)} /></label><button className="button primary w-full" disabled={busy || uploading || fullName.trim().length < 2}><HiOutlineUser />{busy ? "Saving…" : "Save profile"}</button></form>
      <section className="settings-section"><h3>Privacy & notifications</h3><div className="space-y-3"><SiteLockToggle /><NotificationToggle /></div></section>
      <section className="settings-section"><h3>Blocked contacts</h3>{loadingBlocked ? <p className="muted text-sm">Loading contacts…</p> : blockedError ? <div className="inline-error"><p>{blockedError}</p><button className="text-button" onClick={loadBlocked}>Retry</button></div> : !blocked.length ? <p className="muted text-sm">No blocked contacts.</p> : <div className="space-y-2">{blocked.map((contact) => <div key={contact._id} className="settings-row"><HiOutlineBan /><div><strong>{contact.fullName}</strong><p>@{contact.username}</p></div><button className="text-button" disabled={!!unblocking} onClick={() => unblock(contact)}>{unblocking === contact._id ? "…" : "Unblock"}</button></div>)}</div>}</section>
      <section className="settings-section"><h3>App</h3><InstallAppButton variant="card" /></section>
      <button className="button secondary w-full mt-5" onClick={async () => { await logout(); onClose(); toast.success("Logged out"); }}><HiOutlineLogout /> Log out</button>
    </div>
  </Modal>;
};
export default ProfileSettings;
