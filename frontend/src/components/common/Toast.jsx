import React from "react";
import { Toaster } from "react-hot-toast";

// Custom Toast Provider with Talish Talks theme
const ToastProvider = () => {
  return (
    <Toaster
      position="top-right"
      reverseOrder={false}
      gutter={8}
      containerClassName=""
      containerStyle={{}}
      toastOptions={{
        // Default options for all toasts
        className: "",
        duration: 4000,
        style: {
          background: "#1A1A1A",
          color: "#E8E8E8",
          border: "1px solid #2A2A2A",
          borderRadius: "12px",
          padding: "12px 16px",
          fontSize: "14px",
          fontFamily: "Inter, sans-serif",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.4)",
        },
        // Success toast
        success: {
          duration: 3000,
          iconTheme: {
            primary: "#E8713A",
            secondary: "#FFFFFF",
          },
          style: {
            borderLeft: "3px solid #E8713A",
          },
        },
        // Error toast
        error: {
          duration: 5000,
          iconTheme: {
            primary: "#EF4444",
            secondary: "#FFFFFF",
          },
          style: {
            borderLeft: "3px solid #EF4444",
          },
        },
        // Loading toast
        loading: {
          iconTheme: {
            primary: "#E8713A",
            secondary: "#1A1A1A",
          },
        },
      }}
    />
  );
};

export default ToastProvider;
