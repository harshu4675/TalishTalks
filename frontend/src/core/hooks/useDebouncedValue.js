/**
 * Debounce a rapidly changing value (search inputs, resize observers).
 */

import { useEffect, useState } from "react";

/**
 * @template T
 * @param {T} value The value to debounce.
 * @param {number} delay Milliseconds to wait before the value settles.
 * @returns {T} The debounced value.
 */
export const useDebouncedValue = (value, delay = 300) => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
};

export default useDebouncedValue;
