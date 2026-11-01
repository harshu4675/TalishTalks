import React from "react";
import { HiOutlineLockClosed } from "react-icons/hi";
import Modal from "../common/Modal";
const FirstLockGuide = ({ isOpen, onClose }) => <Modal isOpen={isOpen} onClose={onClose} title="Chat locked">
  <div className="modal-body space-y-4"><HiOutlineLockClosed className="feature-icon" /><p>Your locked conversations are hidden from the main chat and friend lists.</p><ol className="guide-list"><li>Choose <strong>Locked chats</strong> above the conversation list.</li><li>Enter your PIN to reveal them.</li><li>They hide again when you leave or minimize the app.</li></ol><p className="muted text-sm">Use the same PIN for all your locked chats. Remove a lock from its conversation menu.</p></div>
  <footer className="modal-footer"><button className="button primary" onClick={onClose}>Got it</button></footer>
</Modal>;
export default FirstLockGuide;
