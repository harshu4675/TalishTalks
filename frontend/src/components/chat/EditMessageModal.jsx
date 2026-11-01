import React, { useState, useEffect } from "react";
import Modal from "../common/Modal";

const EditMessageModal = ({ isOpen, onClose, message, onSave }) => {
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (isOpen) setContent(message?.content || ""); }, [isOpen, message?._id, message?.content]);
  const save = async (event) => {
    event.preventDefault();
    if (!content.trim() || saving) return;
    if (content.trim() === message.content) { onClose(); return; }
    setSaving(true);
    try { await onSave(content.trim()); } finally { setSaving(false); }
  };
  return <Modal isOpen={isOpen} onClose={onClose} title="Edit message" closeDisabled={saving}>
    <form onSubmit={save}><div className="modal-body"><textarea data-autofocus className="input" rows={4} maxLength={5000} value={content} onChange={(event) => setContent(event.target.value)} aria-label="Message text" /></div>
      <footer className="modal-footer"><button type="button" className="button secondary" onClick={onClose} disabled={saving}>Cancel</button><button className="button primary" disabled={!content.trim() || saving}>{saving ? "Saving…" : "Save changes"}</button></footer>
    </form>
  </Modal>;
};
export default EditMessageModal;
