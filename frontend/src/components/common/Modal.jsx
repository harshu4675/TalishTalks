import React, { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { HiOutlineX } from "react-icons/hi";
import { useBackButton } from "../../hooks/useBackButton";

let scrollLocks = 0;
let previousOverflow = "";
const lockScroll = () => {
  if (scrollLocks++ === 0) { previousOverflow = document.body.style.overflow; document.body.style.overflow = "hidden"; }
  let released = false;
  return () => { if (!released) { released = true; if (--scrollLocks === 0) document.body.style.overflow = previousOverflow; } };
};

const Modal = ({ isOpen, onClose, title, description, children, className = "", closeDisabled = false }) => {
  const titleId = useId();
  const panelRef = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useBackButton(isOpen, () => { if (!closeDisabled) closeRef.current(); });
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement;
    const panel = panelRef.current;
    const focusable = () => [...panel.querySelectorAll('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href], [tabindex="0"]')];
    const frame = requestAnimationFrame(() => (panel.querySelector("[data-autofocus]") || focusable()[0] || panel).focus());
    const onKey = (event) => {
      const dialogs = document.querySelectorAll('[role="dialog"][aria-modal="true"]');
      if (dialogs[dialogs.length - 1] !== panel) return;
      if (event.key === "Escape" && !closeDisabled) closeRef.current();
      if (event.key !== "Tab") return;
      const items = focusable();
      if (!items.length) { event.preventDefault(); return; }
      const first = items[0], last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    const releaseScroll = lockScroll();
    document.addEventListener("keydown", onKey);
    return () => { cancelAnimationFrame(frame); releaseScroll(); document.removeEventListener("keydown", onKey); if (previous?.isConnected) previous.focus(); };
  }, [isOpen, closeDisabled]);
  if (!isOpen) return null;
  return createPortal(
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !closeDisabled) onClose(); }}>
      <section ref={panelRef} className={`modal-panel ${className}`} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <header className="modal-header">
          <div><h2 id={titleId}>{title}</h2>{description && <p className="muted text-sm mt-1">{description}</p>}</div>
          <button className="icon-button" onClick={onClose} disabled={closeDisabled} aria-label="Close dialog"><HiOutlineX /></button>
        </header>
        {children}
      </section>
    </div>, document.body,
  );
};
export default Modal;
