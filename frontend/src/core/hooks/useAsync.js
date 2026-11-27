/**
 * A tiny async-state helper.
 *
 * Models the four states an async operation can be in - idle, loading, success
 * and error - without forcing every call site to hand-roll the same three
 * `useState` calls.
 */

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * @template T
 * @param {(signal: AbortSignal) => Promise<T>} asyncFn The operation to run.
 * @param {Array} deps Re-runs the operation when these change.
 * @param {object} [options]
 * @param {boolean} [options.immediate] Run on mount (default true).
 * @param {T} [options.initialData] Seed value for `data`.
 */
export const useAsync = (asyncFn, deps = [], options = {}) => {
  const { immediate = true, initialData = null } = options;

  const [data, setData] = useState(initialData);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(Boolean(immediate));

  const mounted = useRef(true);
  const controllerRef = useRef(null);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      controllerRef.current?.abort();
    };
  }, []);

  const execute = useCallback(async (...args) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    setIsLoading(true);
    setError(null);
    try {
      const result = await asyncFn(controller.signal, ...args);
      if (mounted.current && !controller.signal.aborted) {
        setData(result);
        setError(null);
      }
      return result;
    } catch (caught) {
      if (mounted.current && !controller.signal.aborted) {
        setError(caught);
      }
      throw caught;
    } finally {
      if (mounted.current && !controller.signal.aborted) {
        setIsLoading(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    if (!immediate) return;
    execute().catch(() => {
      /* the error is surfaced through `error` */
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const reset = useCallback(() => {
    setData(initialData);
    setError(null);
    setIsLoading(false);
  }, [initialData]);

  return { data, error, isLoading, execute, reset, setData };
};

export default useAsync;
