import React from "react";
import { Toaster } from "react-hot-toast";
const ToastProvider = () => <Toaster position="top-center" gutter={8} toastOptions={{
  duration: 4000,
  style: { pointerEvents: "none", background: "#FFFFFF", color: "#1C1E21", border: "1px solid #E4E6EB", borderRadius: "10px", padding: "12px 16px", fontSize: "14px", boxShadow: "0 4px 20px rgb(28 30 33 / 10%)" },
  success: { iconTheme: { primary: "#0866FF", secondary: "#FFFFFF" } },
  error: { duration: 5500, iconTheme: { primary: "#D92D20", secondary: "#FFFFFF" } },
  loading: { iconTheme: { primary: "#0866FF", secondary: "#E7F0FF" } },
}} />;
export default ToastProvider;
