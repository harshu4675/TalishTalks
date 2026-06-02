import { useEffect } from "react";

/**
 * Handle browser/Android back button to navigate within app
 * @param {boolean} enabled - Whether the back handler should be active
 * @param {function} handler - Function to call when back is pressed
 * @param {array} deps - Dependencies for the effect
 */
export const useBackButton = (enabled, handler, deps = []) => {
  useEffect(() => {
    if (!enabled) return;

    // Push a new state when component mounts/becomes active
    window.history.pushState({ modal: true }, "");

    const handlePopState = (event) => {
      // Prevent default back action
      handler();
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      // If component unmounts naturally (not via back button),
      // clean up the history state we pushed
      if (window.history.state?.modal) {
        window.history.back();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps]);
};

export default useBackButton;
