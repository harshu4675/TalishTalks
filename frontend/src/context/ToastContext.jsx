import React, { createContext } from "react";
import toast from "react-hot-toast";

// Create Toast Context
export const ToastContext = createContext(null);

// Toast Provider with helper methods
export const ToastProvider = ({ children }) => {
  // Show success toast
  const showSuccess = (message) => {
    toast.success(message);
  };

  // Show error toast
  const showError = (message) => {
    toast.error(message);
  };

  // Show info toast
  const showInfo = (message) => {
    toast(message, {
      icon: "ℹ️",
      style: {
        borderLeft: "3px solid #4A7CFF",
      },
    });
  };

  // Show warning toast
  const showWarning = (message) => {
    toast(message, {
      icon: "⚠️",
      style: {
        borderLeft: "3px solid #F59E0B",
      },
    });
  };

  // Show loading toast (returns ID for dismissal)
  const showLoading = (message) => {
    return toast.loading(message);
  };

  // Dismiss a specific toast
  const dismiss = (toastId) => {
    toast.dismiss(toastId);
  };

  // Show a promise toast
  const showPromise = (promise, messages) => {
    return toast.promise(promise, {
      loading: messages.loading || "Loading...",
      success: messages.success || "Success!",
      error: messages.error || "Something went wrong",
    });
  };

  const value = {
    showSuccess,
    showError,
    showInfo,
    showWarning,
    showLoading,
    dismiss,
    showPromise,
  };

  return (
    <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
  );
};

export default ToastProvider;
