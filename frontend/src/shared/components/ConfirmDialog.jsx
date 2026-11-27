/**
 * ConfirmDialog - a modal for destructive or irreversible actions.
 */

import Modal from "./Modal.jsx";
import Button from "./Button.jsx";

/**
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {() => void} props.onConfirm
 * @param {string} props.title
 * @param {string} [props.message]
 * @param {string} [props.confirmLabel]
 * @param {boolean} [props.danger] Style the confirm button as destructive.
 * @param {boolean} [props.busy] Disable the buttons while the action runs.
 */
export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  busy = false,
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button variant={danger ? "danger" : "primary"} onClick={onConfirm} loading={busy}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {message ? <p style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>{message}</p> : null}
    </Modal>
  );
}
