import React from "react";
import Modal from "./Modal";

const ConfirmDialog = ({ open, title, description, confirmLabel = "Confirm", danger = false, busy = false, onConfirm, onClose }) => (
  <Modal isOpen={open} onClose={onClose} title={title} closeDisabled={busy}>
    <div className="modal-body"><p className="muted leading-relaxed">{description}</p></div>
    <footer className="modal-footer">
      <button className="button secondary" onClick={onClose} disabled={busy}>Cancel</button>
      <button className={`button ${danger ? "danger" : "primary"}`} onClick={onConfirm} disabled={busy}>{busy ? "Working…" : confirmLabel}</button>
    </footer>
  </Modal>
);
export default ConfirmDialog;
