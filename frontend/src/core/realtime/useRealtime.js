/**
 * Access hook for the realtime context.
 *
 * @returns {import('./RealtimeProvider.jsx').RealtimeContextValue}
 */
import { useContext, useEffect, useRef } from "react";
import { RealtimeContext } from "./RealtimeProvider.jsx";

export const useRealtime = () => {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error("useRealtime must be used inside a <RealtimeProvider>.");
  }
  return context;
};

/**
 * Subscribe to a single realtime event for the lifetime of a component.
 *
 * @param {string} event The server event name.
 * @param {(payload: any) => void} handler Called with the server payload.
 */
export const useRealtimeEvent = (event, handler) => {
  const { subscribe } = useRealtime();
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!event) return undefined;
    return subscribe(event, (payload) => handlerRef.current?.(payload));
  }, [event, subscribe]);
};

export default useRealtime;
