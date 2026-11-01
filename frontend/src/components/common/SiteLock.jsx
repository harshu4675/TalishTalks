import React, { useState } from "react";
import { HiOutlineLockClosed } from "react-icons/hi";
import TalishLogo from "../../assets/logo";
import Modal from "./Modal";
import { verifyDeviceLock, setDeviceLock, clearDeviceLock } from "../../utils/deviceLock";
import { authAPI } from "../../services/api";
import { errorMessage } from "../../utils/messages";

const SiteLock = ({ onUnlock }) => {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [recovery, setRecovery] = useState(false);
  const [accountPassword, setAccountPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  let username = "";
  try { username = JSON.parse(localStorage.getItem("talish_user") || "{}").username || ""; } catch { /* Recover with a username below. */ }
  const [identifier, setIdentifier] = useState(username);
  const unlock = async (event) => {
    event.preventDefault(); setBusy(true); setError("");
    try { if (await verifyDeviceLock(password)) onUnlock(); else setError("Incorrect device password. Try again."); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  };
  const recover = async (event) => {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await authAPI.login({ identifier, password: accountPassword });
      localStorage.setItem("talish_token", response.data.token);
      localStorage.setItem("talish_user", JSON.stringify(response.data.user));
      if (newPassword) await setDeviceLock(newPassword); else clearDeviceLock();
      setRecovery(false); onUnlock();
    } catch (failure) { setError(errorMessage(failure, "Could not verify your account.")); }
    finally { setBusy(false); }
  };
  return <div className="auth-page"><div className="auth-container"><div className="auth-brand"><TalishLogo size="lg" /></div><form className="auth-card auth-form" onSubmit={unlock}>
    <HiOutlineLockClosed className="feature-icon" /><h1>Unlock this device</h1><p className="muted">Enter your device password to continue. Your account session is still protected by your account password.</p>
    <label className="field-label">Device password<input data-autofocus className="input" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
    {error && !recovery && <p className="form-error" role="alert">{error}</p>}
    <button className="button primary" disabled={busy || !password}>{busy ? "Checking…" : "Unlock"}</button><button type="button" className="text-button" onClick={() => { setRecovery(true); setError(""); }}>Forgot device password?</button>
  </form></div>
  <Modal isOpen={recovery} onClose={() => setRecovery(false)} title="Verify your account" description="Sign in with your account credentials to reset this device’s privacy lock." closeDisabled={busy}>
    <form onSubmit={recover}><div className="modal-body space-y-4">
      <label className="field-label">Account email or username<input className="input" value={identifier} onChange={(event) => setIdentifier(event.target.value)} autoComplete="username" required /></label>
      <label className="field-label">Account password<input className="input" type="password" value={accountPassword} onChange={(event) => setAccountPassword(event.target.value)} autoComplete="current-password" required /></label>
      <label className="field-label">New device password (optional)<input className="input" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" minLength={6} placeholder="Leave empty to disable device lock" /></label>
      {error && <p className="form-error" role="alert">{error}</p>}
    </div><footer className="modal-footer"><button className="button primary" disabled={busy || !identifier || !accountPassword}>{busy ? "Verifying…" : "Verify and reset lock"}</button></footer></form>
  </Modal></div>;
};
export default SiteLock;
