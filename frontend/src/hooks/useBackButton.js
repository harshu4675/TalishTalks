import { useEffect } from "react";

/**
 * Handle browser/Android back button to navigate within app instead of exiting
 * @param {boolean} enabled - Whether the back handler should be active
 * @param {function} handler - Function to call when back is pressed
 */
export const useBackButton = (enabled, handler) => {
  useEffect(() => {
    if (!enabled) return;

    // Push a fake history state when component becomes active
    window.history.pushState({ talishModal: true, timestamp: Date.now() }, "");

    const handlePopState = (event) => {
      handler();
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      // 🔥 FIX: Don't call history.back() on cleanup
      // The popstate event already handles state cleanup
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);
};

export default useBackButton;
