/**
 * ToastProvider - transient, non-blocking feedback.
 *
 * The provider exposes a `useToast()` hook with `success`, `error`, `info`
 * and `warning` helpers plus a `dismiss` function.
 */

import { useCallback, useMemo, useRef, useState } from "react";
import { FiAlertCircle, FiCheckCircle, FiInfo, FiX } from "react-icons/fi";

import { ToastContext } from "./toastContext.js";

const ICONS = {
  success: <FiCheckCircle size={18} />,
  error: <FiAlertCircle size={18} />,
  info: <FiInfo size={18} />,
  warning: <FiAlertCircle size={18} />,
};

const DEFAULT_DURATION = 4500;

/** Provide the toast queue to the application. */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());
  const counter = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (variant, title, message, duration) => {
      counter.current += 1;
      const id = `toast-${counter.current}`;
      const entry = { id, variant, title, message };

      setToasts((current) => [...current.slice(-3), entry]);

      const timeout = duration ?? DEFAULT_DURATION;
      if (timeout > 0) {
        timers.current.set(
          id,
          setTimeout(() => dismiss(id), timeout),
        );
      }
      return id;
    },
    [dismiss],
  );

  const value = useMemo(
    () => ({
      toasts,
      dismiss,
      success: (title, message, duration) => push("success", title, message, duration),
      error: (title, message, duration) => push("error", title, message, duration),
      info: (title, message, duration) => push("info", title, message, duration),
      warning: (title, message, duration) => push("warning", title, message, duration),
      /** Convenience helper that derives the title from an error object. */
      fromError: (error, fallbackTitle = "Something went wrong") =>
        push("error", fallbackTitle, error?.message || "Please try again.", 6000),
    }),
    [toasts, dismiss, push],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-region" role="region" aria-live="polite" aria-label="Notifications">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast--${toast.variant}`} role="status">
            <span className="toast__icon" aria-hidden="true">
              {ICONS[toast.variant] ?? ICONS.info}
            </span>
            <div className="toast__body">
              <p className="toast__title">{toast.title}</p>
              {toast.message ? <p className="toast__message">{toast.message}</p> : null}
            </div>
            <button
              type="button"
              className="toast__close"
              onClick={() => dismiss(toast.id)}
              aria-label="Dismiss notification"
            >
              <FiX size={15} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export { ToastContext };
export default ToastProvider;
