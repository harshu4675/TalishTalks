import React, { useState, useEffect } from "react";
import Modal from "../common/Modal";
import { errorMessage } from "../../utils/messages";

const PinModal = ({ isOpen, onClose, onSubmit, mode = "verify", title = "Enter PIN", subtitle = "" }) => {
  const [pin, setPin] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { if (isOpen) { setPin(""); setConfirmation(""); setStep(1); setError(""); setBusy(false); } }, [isOpen]);
  const submit = async (event) => {
    event.preventDefault(); setError("");
    if (!/^\d{4,12}$/.test(pin)) { setError("Use 4 to 12 digits."); return; }
    if (mode === "set" && step === 1) { setStep(2); return; }
    if (mode === "set" && pin !== confirmation) { setError("PINs do not match."); return; }
    setBusy(true);
    try { await onSubmit(pin); } catch (failure) { setError(errorMessage(failure, "Incorrect PIN. Try again.")); }
    finally { setBusy(false); }
  };
  return <Modal isOpen={isOpen} onClose={onClose} title={title} description={subtitle} closeDisabled={busy}>
    <form onSubmit={submit}><div className="modal-body space-y-4">
      <label className="field-label">{mode === "set" && step === 2 ? "Confirm PIN" : "Chat lock PIN"}<input data-autofocus className="input pin-input" type="password" inputMode="numeric" autoComplete="off" maxLength={12} value={mode === "set" && step === 2 ? confirmation : pin} onChange={(event) => (mode === "set" && step === 2 ? setConfirmation : setPin)(event.target.value.replace(/\D/g, ""))} placeholder="Enter your PIN" /></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <p className="muted text-xs">Chat locks hide conversations on your account. They do not encrypt messages or replace your account password.</p>
    </div><footer className="modal-footer"><button type="button" className="button secondary" onClick={onClose} disabled={busy}>Cancel</button><button className="button primary" disabled={busy || (mode === "set" && step === 2 ? confirmation.length < 4 : pin.length < 4)}>{busy ? "Checking…" : mode === "set" && step === 1 ? "Continue" : "Confirm"}</button></footer></form>
  </Modal>;
};
export default PinModal;
