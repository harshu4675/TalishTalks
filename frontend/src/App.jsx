import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { SocketProvider } from "./context/SocketContext";
import { ChatProvider } from "./context/ChatContext";
import { ToastProvider } from "./context/ToastContext";
import { FriendsProvider } from "./context/FriendsContext";
import { ThemeProvider } from "./context/ThemeContext";
import { PWAProvider } from "./context/PWAContext";
import ToastNotifications from "./components/common/Toast";
import LoadingScreen from "./components/common/LoadingScreen";
import ProtectedRoute from "./components/common/ProtectedRoute";
import ErrorBoundary from "./components/common/ErrorBoundary";
import SiteLock from "./components/common/SiteLock";
import PWAInstallPrompt from "./components/common/PWAInstallPrompt";
import UpdatePrompt from "./components/common/UpdatePrompt";
import AuthPage from "./pages/AuthPage";
import ChatPage from "./pages/ChatPage";
import NotFound from "./pages/NotFound";

import "./styles/animations.css";

const LOCK_ENABLED_KEY = "talish_site_lock_enabled";
const PASSWORD_KEY = "talish_site_password";

function App() {
  const [showInitialLoader, setShowInitialLoader] = useState(true);
  const [siteUnlocked, setSiteUnlocked] = useState(false);
  const [lockChecked, setLockChecked] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowInitialLoader(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // 🔥 Check if site lock is enabled
  useEffect(() => {
    const lockEnabled = localStorage.getItem(LOCK_ENABLED_KEY);
    const hasPassword = localStorage.getItem(PASSWORD_KEY);

    // If lock is explicitly disabled OR no password set, skip lock
    if (lockEnabled === "false" || !hasPassword) {
      setSiteUnlocked(true);
    }

    setLockChecked(true);
  }, []);

  if (showInitialLoader || !lockChecked) {
    return (
      <ThemeProvider>
        <LoadingScreen onFinished={() => setShowInitialLoader(false)} />
      </ThemeProvider>
    );
  }

  if (!siteUnlocked) {
    return (
      <ThemeProvider>
        <SiteLock onUnlock={() => setSiteUnlocked(true)} />
      </ThemeProvider>
    );
  }

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <PWAProvider>
          <Router
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <AuthProvider>
              <SocketProvider>
                <FriendsProvider>
                  <ChatProvider>
                    <ToastProvider>
                      <ToastNotifications />
                      <PWAInstallPrompt />
                      <UpdatePrompt />
                      <div className="App">
                        <Routes>
                          <Route path="/auth" element={<AuthPage />} />
                          <Route
                            path="/"
                            element={
                              <ProtectedRoute>
                                <ChatPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/chat/:chatId"
                            element={
                              <ProtectedRoute>
                                <ChatPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route path="/404" element={<NotFound />} />
                          <Route
                            path="*"
                            element={<Navigate to="/404" replace />}
                          />
                        </Routes>
                      </div>
                    </ToastProvider>
                  </ChatProvider>
                </FriendsProvider>
              </SocketProvider>
            </AuthProvider>
          </Router>
        </PWAProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
