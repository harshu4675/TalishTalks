import { useLayoutEffect, useRef } from "react";
import { pushOverlay } from "../utils/overlayHistory";

export const useBackButton = (enabled, handler) => {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;
  useLayoutEffect(() => {
    if (!enabled) return;
    // Synchronous setup/teardown also handles React StrictMode's immediate remount.
    return pushOverlay(() => handlerRef.current?.());
  }, [enabled]);
};
export default useBackButton;
