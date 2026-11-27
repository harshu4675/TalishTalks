/**
 * Access hook for the toast queue.
 *
 * Lives in its own module so the provider file only exports components.
 */

import { useContext } from "react";

import { ToastContext } from "./toastContext.js";

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used inside a <ToastProvider>.");
  }
  return context;
};

export default useToast;
