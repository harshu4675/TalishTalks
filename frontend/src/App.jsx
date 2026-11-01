import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { SocketProvider } from "./context/SocketContext";
import { ChatProvider } from "./context/ChatContext";
import { FriendsProvider } from "./context/FriendsContext";
import { PWAProvider } from "./context/PWAContext";
import ToastNotifications from "./components/common/Toast";
import ProtectedRoute from "./components/common/ProtectedRoute";
import ErrorBoundary from "./components/common/ErrorBoundary";
import DeviceLockGate from "./components/common/DeviceLockGate";
import UpdatePrompt from "./components/common/UpdatePrompt";
import AuthPage from "./pages/AuthPage";
import ChatPage from "./pages/ChatPage";
import NotFound from "./pages/NotFound";
import "./styles/animations.css";

function App() {
  useEffect(() => {
    localStorage.removeItem("talish_theme");
    document.documentElement.classList.remove("dark", "dark-mode", "light-mode");
    document.documentElement.style.colorScheme = "light";
    const viewport = window.visualViewport;
    const resize = () => {
      document.documentElement.style.setProperty("--app-height", `${viewport?.height || window.innerHeight}px`);
      document.documentElement.style.setProperty("--keyboard-offset", `${Math.max(0, window.innerHeight - (viewport?.height || window.innerHeight) - (viewport?.offsetTop || 0))}px`);
    };
    resize(); viewport?.addEventListener("resize", resize); viewport?.addEventListener("scroll", resize); window.addEventListener("resize", resize);
    return () => { viewport?.removeEventListener("resize", resize); viewport?.removeEventListener("scroll", resize); window.removeEventListener("resize", resize); };
  }, []);
  return <ErrorBoundary><PWAProvider><Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><AuthProvider><DeviceLockGate><SocketProvider><FriendsProvider><ChatProvider>
    <ToastNotifications /><UpdatePrompt />
    <div className="App"><Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
      <Route path="/chat/:chatId" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
      <Route path="/404" element={<NotFound />} /><Route path="*" element={<Navigate to="/404" replace />} />
    </Routes></div>
  </ChatProvider></FriendsProvider></SocketProvider></DeviceLockGate></AuthProvider></Router></PWAProvider></ErrorBoundary>;
}
export default App;
