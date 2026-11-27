/**
 * Menu - a floating, viewport-aware action menu.
 *
 * The menu is rendered in a portal and positioned against its trigger. It
 * flips above the trigger when there is not enough room below, and it is
 * clamped to the viewport so it can never open off-screen.
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const MARGIN = 8;
const GAP = 6;

/**
 * @param {object} props
 * @param {boolean} props.open Whether the menu is visible.
 * @param {import('react').RefObject<HTMLElement>} props.anchorRef The trigger.
 * @param {() => void} props.onClose Called when the menu should close.
 * @param {import('react').ReactNode} props.children The menu items.
 * @param {"left"|"right"} [props.align] Which edge of the trigger to align to.
 * @param {number} [props.width] The menu width in pixels.
 */
export default function Menu({
  open,
  anchorRef,
  onClose,
  children,
  align = "right",
  width = 208,
}) {
  const menuRef = useRef(null);
  const [position, setPosition] = useState({ top: 0, left: 0, visibility: "hidden" });

  /* Position the menu against its trigger whenever it opens. */
  const reposition = useCallback(() => {
    const anchor = anchorRef?.current;
    if (!anchor) return;

    const rect = anchor.getBoundingClientRect();
    const height = menuRef.current?.offsetHeight ?? 0;

    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const flip = spaceBelow < height + GAP + MARGIN && spaceAbove > spaceBelow;

    const top = flip
      ? Math.max(MARGIN, rect.top - height - GAP)
      : Math.min(rect.bottom + GAP, window.innerHeight - height - MARGIN);

    const preferredLeft = align === "left" ? rect.left : rect.right - width;
    const left = Math.min(Math.max(MARGIN, preferredLeft), window.innerWidth - width - MARGIN);

    setPosition({ top, left, visibility: "visible" });
  }, [anchorRef, align, width]);

  useLayoutEffect(() => {
    if (!open) {
      setPosition((current) => ({ ...current, visibility: "hidden" }));
      return;
    }
    reposition();
  }, [open, reposition]);

  /* Keep the menu anchored while the page scrolls or resizes. */
  useEffect(() => {
    if (!open) return undefined;
    const handle = () => reposition();
    window.addEventListener("scroll", handle, true);
    window.addEventListener("resize", handle);
    return () => {
      window.removeEventListener("scroll", handle, true);
      window.removeEventListener("resize", handle);
    };
  }, [open, reposition]);

  /* Close on Escape or on an outside interaction. */
  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      const anchor = anchorRef?.current;
      if (menuRef.current?.contains(event.target)) return;
      if (anchor?.contains(event.target)) return;
      onClose?.();
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose, anchorRef]);

  if (!open) return null;

  return createPortal(
    <div
      ref={menuRef}
      className="menu"
      role="menu"
      style={{ position: "fixed", top: position.top, left: position.left, width, visibility: position.visibility }}
    >
      {children}
    </div>,
    document.body,
  );
}
