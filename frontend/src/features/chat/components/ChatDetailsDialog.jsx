/**
 * ChatDetailsDialog - everything you can do with a conversation.
 */

import { useState } from "react";
import {
  FiBell,
  FiBellOff,
  FiCheckCircle,
  FiClock,
  FiHash,
  FiTrash2,
  FiUserMinus,
} from "react-icons/fi";

import { useAuth } from "../../../core/auth/useAuth.js";
import { useChats } from "../context/useChats.js";
import { useFriends } from "../../friends/context/useFriends.js";
import Avatar from "../../../shared/components/Avatar.jsx";
import Button from "../../../shared/components/Button.jsx";
import ConfirmDialog from "../../../shared/components/ConfirmDialog.jsx";
import Modal from "../../../shared/components/Modal.jsx";
import { useToast } from "../../../shared/components/useToast.js";
import { PinIcon } from "../../../shared/components/icons.jsx";

const DISAPPEARING_MODES = [
  { id: "off", label: "Off", description: "Messages are kept forever." },
  { id: "on_seen", label: "When seen", description: "Messages disappear once they have been read." },
  { id: "after_2min", label: "After 2 minutes", description: "Read messages disappear two minutes later." },
];

/**
 * @param {object} props
 * @param {boolean} props.open
 * @param {object} props.chat
 * @param {() => void} props.onClose
 * @param {() => void} props.onRemoved Called after the chat is removed.
 */
export default function ChatDetailsDialog({ open, chat, onClose, onRemoved }) {
  const { user } = useAuth();
  const { togglePin, toggleMute, toggleMarkUnread, setDisappearing, clearChat, removeChat } = useChats();
  const { removeFriend } = useFriends();
  const toast = useToast();

  const [busy, setBusy] = useState(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [confirmUnfriend, setConfirmUnfriend] = useState(false);

  if (!chat) return null;
  const other = chat.otherUser;

  const run = async (key, action, successMessage) => {
    setBusy(key);
    try {
      await action();
      if (successMessage) toast.success(successMessage);
    } catch (error) {
      toast.error("That did not work", error.message);
    } finally {
      setBusy(null);
    }
  };

  const currentMode = chat.disappearingMessages?.mode || "off";

  return (
    <>
      <Modal open={open} onClose={onClose} title="Conversation details">
        <div style={{ display: "grid", gap: "var(--space-5)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
            <Avatar src={other?.avatar} name={other?.fullName} size="lg" online={other?.isOnline} />
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: "var(--text-lg)", fontWeight: "var(--weight-semibold)" }}>
                {other?.fullName}
              </p>
              <p style={{ color: "var(--text-tertiary)", fontSize: "var(--text-sm)" }}>
                @{other?.username}
              </p>
            </div>
          </div>

          <div style={{ display: "grid", gap: "var(--space-2)" }}>
            <p className="field__label">Chat options</p>

            <button
              type="button"
              className="menu__item"
              onClick={() => run("pin", () => togglePin(chat._id))}
              disabled={busy === "pin"}
            >
              <PinIcon size={16} />
              {chat.isPinned ? "Unpin conversation" : "Pin conversation"}
            </button>

            <button
              type="button"
              className="menu__item"
              onClick={() => run("mute", () => toggleMute(chat._id))}
              disabled={busy === "mute"}
            >
              {chat.isMuted ? <FiBell size={16} /> : <FiBellOff size={16} />}
              {chat.isMuted ? "Unmute notifications" : "Mute notifications"}
            </button>

            <button
              type="button"
              className="menu__item"
              onClick={() => run("unread", () => toggleMarkUnread(chat._id))}
              disabled={busy === "unread"}
            >
              <FiCheckCircle size={16} />
              {chat.isMarkedUnread ? "Mark as read" : "Mark as unread"}
            </button>

            <button
              type="button"
              className="menu__item"
              onClick={() => setConfirmClear(true)}
              disabled={busy === "clear"}
            >
              <FiTrash2 size={16} />
              Clear messages for me
            </button>

            <button
              type="button"
              className="menu__item menu__item--danger"
              onClick={() => setConfirmRemove(true)}
              disabled={busy === "remove"}
            >
              <FiTrash2 size={16} />
              Remove conversation
            </button>
          </div>

          <div style={{ display: "grid", gap: "var(--space-2)" }}>
            <p className="field__label">
              <FiClock size={13} style={{ display: "inline", verticalAlign: "-2px" }} /> Disappearing
              messages
            </p>
            <div style={{ display: "grid", gap: "var(--space-2)" }}>
              {DISAPPEARING_MODES.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  className="menu__item"
                  onClick={() => run(`mode-${mode.id}`, () => setDisappearing(chat._id, mode.id))}
                  disabled={busy === `mode-${mode.id}`}
                  style={{
                    alignItems: "flex-start",
                    background: currentMode === mode.id ? "var(--brand-50)" : undefined,
                  }}
                >
                  <FiHash size={15} style={{ marginTop: 3 }} />
                  <span>
                    <span style={{ display: "block", fontWeight: "var(--weight-semibold)" }}>
                      {mode.label}
                    </span>
                    <span style={{ display: "block", color: "var(--text-tertiary)", fontSize: "var(--text-xs)" }}>
                      {mode.description}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-2)" }}>
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
            <Button
              variant="danger-ghost"
              onClick={() => setConfirmUnfriend(true)}
              disabled={busy === "unfriend"}
            >
              <FiUserMinus size={15} /> Remove friend
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        title="Clear this conversation?"
        message="The messages will be removed from your view only. Your contact keeps their copy."
        confirmLabel="Clear messages"
        onConfirm={async () => {
          setConfirmClear(false);
          await run("clear", () => clearChat(chat._id), "Messages cleared");
        }}
      />

      <ConfirmDialog
        open={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        title="Remove this conversation?"
        message="The conversation will disappear from your list and its history will be cleared for you."
        confirmLabel="Remove"
        danger
        onConfirm={async () => {
          setConfirmRemove(false);
          await run("remove", () => removeChat(chat._id));
          onRemoved?.();
        }}
      />

      <ConfirmDialog
        open={confirmUnfriend}
        onClose={() => setConfirmUnfriend(false)}
        title={`Remove ${other?.fullName || "this friend"}?`}
        message="You will no longer be connected and you will not be able to start new conversations."
        confirmLabel="Remove friend"
        danger
        onConfirm={async () => {
          setConfirmUnfriend(false);
          await run("unfriend", () => removeFriend(other._id), "Friend removed");
          onRemoved?.();
        }}
      />

      <span hidden>{user?.username}</span>
    </>
  );
}
