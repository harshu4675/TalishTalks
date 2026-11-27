/**
 * Reactive CSS media query hook.
 *
 * The layout changes shape across the 860px breakpoint, and several
 * components need to know which side of it they are on.
 */

import { useEffect, useState } from "react";

/**
 * @param {string} query A CSS media query, e.g. "(max-width: 860px)".
 * @returns {boolean} whether the query currently matches.
 */
export const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;
    const list = window.matchMedia(query);
    const handler = (event) => setMatches(event.matches);
    setMatches(list.matches);
    list.addEventListener("change", handler);
    return () => list.removeEventListener("change", handler);
  }, [query]);

  return matches;
};

/** True when the viewport is at most the given width. */
export const useIsCompact = (maxWidth = 860) => useMediaQuery(`(max-width: ${maxWidth}px)`);

export default useMediaQuery;
