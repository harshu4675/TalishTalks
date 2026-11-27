/**
 * Modal - an accessible dialog rendered in a portal.
 */

import { useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { FiX } from "react-icons/fi";

/**
 * @param {object} props
 * @param {boolean} props.open Whether the dialog is visible.
 * @param {() => void} props.onClose Called for backdrop clicks and Escape.
 * @param {string} props.title
 * @param {string} [props.subtitle]
 * @param {boolean} [props.wide] Use the wider layout.
 * @param {import('react').ReactNode} [props.footer] Dialog actions.
 */
export default function Modal({
  open,
  onClose,
  title,
  subtitle,
  wide = false,
  footer,
  children,
  closeLabel = "Close dialog",
}) {
  const panelRef = useRef(null);

  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose?.();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return undefined;
    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return createPortal(
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <div
        className={`modal ${wide ? "modal--wide" : ""}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        ref={panelRef}
      >
        <header className="modal__header">
          <div>
            <h2 className="modal__title">{title}</h2>
            {subtitle ? <p className="modal__subtitle">{subtitle}</p> : null}
          </div>
          <button type="button" className="btn btn--ghost btn--icon btn--sm" onClick={onClose} aria-label={closeLabel}>
            <FiX size={18} />
          </button>
        </header>
        <div className="modal__body">{children}</div>
        {footer ? <footer className="modal__footer">{footer}</footer> : null}
      </div>
    </div>,
    document.body,
  );
}
