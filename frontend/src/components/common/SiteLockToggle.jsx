import React, { useState } from "react";
import { HiOutlineLockClosed } from "react-icons/hi";
import toast from "react-hot-toast";
import Modal from "./Modal";
import { deviceLockEnabled, verifyDeviceLock, setDeviceLock, changeDeviceLockEnabled } from "../../utils/deviceLock";
const SiteLockToggle = () => {
  const [enabled, setEnabled] = useState(deviceLockEnabled);
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError("");
    try {
      if (enabled) { if (!(await verifyDeviceLock(password))) throw new Error("Incorrect device password."); changeDeviceLockEnabled(false); }
      else await setDeviceLock(password);
      setEnabled(!enabled); setOpen(false); setPassword(""); toast.success(enabled ? "Device lock disabled" : "Device lock enabled");
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  };
  return <><div className="settings-row"><HiOutlineLockClosed /><div><strong>Device privacy lock</strong><p>Ask for a device password when opening the app.</p></div><button className={`toggle ${enabled ? "on" : ""}`} role="switch" aria-checked={enabled} aria-label="Device privacy lock" onClick={() => { setOpen(true); setError(""); setPassword(""); }} /></div>
    <Modal isOpen={open} onClose={() => setOpen(false)} title={enabled ? "Disable device lock" : "Set device password"} description="This is a local privacy screen, not message encryption or a replacement for account authentication." closeDisabled={busy}>
      <form onSubmit={submit}><div className="modal-body"><label className="field-label">{enabled ? "Current device password" : "New device password"}<input data-autofocus className="input" type="password" autoComplete={enabled ? "current-password" : "new-password"} minLength={enabled ? 1 : 6} value={password} onChange={(event) => setPassword(event.target.value)} required /></label>{error && <p className="form-error" role="alert">{error}</p>}</div><footer className="modal-footer"><button className="button primary" disabled={busy || !password}>{busy ? "Checking…" : enabled ? "Disable lock" : "Enable lock"}</button></footer></form>
    </Modal>
  </>;
};
export default SiteLockToggle;
