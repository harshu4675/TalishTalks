/**
 * Close a floating element when the user interacts outside of it.
 */

import { useEffect } from "react";

/**
 * @param {import('react').RefObject<HTMLElement>} ref The element to watch.
 * @param {(event: MouseEvent | TouchEvent) => void} handler Called on outside interaction.
 * @param {boolean} [enabled] Set to false to temporarily disable the behaviour.
 */
export const useOnClickOutside = (ref, handler, enabled = true) => {
  useEffect(() => {
    if (!enabled) return undefined;

    const onPointerDown = (event) => {
      const element = ref.current;
      if (!element || element.contains(event.target)) return;
      handler(event);
    };

    const onKeyDown = (event) => {
      if (event.key === "Escape") handler(event);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [ref, handler, enabled]);
};

export default useOnClickOutside;
