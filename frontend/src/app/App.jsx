/**
 * The application root: providers, router and the route table.
 */

import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import AppProviders from "./AppProviders.jsx";
import { RedirectIfAuthed, RequireAuth } from "./RouteGuards.jsx";
import AuthPage from "../features/auth/pages/AuthPage.jsx";
import ChatWorkspace from "../features/chat/pages/ChatWorkspace.jsx";
import ContactsPage from "../features/friends/pages/ContactsPage.jsx";
import ProfilePage from "../features/profile/pages/ProfilePage.jsx";
import SettingsPage from "../features/settings/pages/SettingsPage.jsx";
import NotFoundPage from "../features/chat/pages/NotFoundPage.jsx";
import ErrorBoundary from "../shared/components/ErrorBoundary.jsx";
import ServiceWorkerManager from "../features/pwa/components/ServiceWorkerManager.jsx";

/**
 * Keeps the document title in sync with the route.
 */
function useDocumentTitle() {
  useEffect(() => {
    document.title = "Talish Talks";
  }, []);
}

/**
 * The application component.
 */
export default function App() {
  useDocumentTitle();

  return (
    <ErrorBoundary>
      <AppProviders>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <ServiceWorkerManager />
          <Routes>
            <Route
              path="/signin"
              element={
                <RedirectIfAuthed>
                  <AuthPage />
                </RedirectIfAuthed>
              }
            />
            <Route
              path="/register"
              element={
                <RedirectIfAuthed>
                  <AuthPage />
                </RedirectIfAuthed>
              }
            />
            <Route
              path="/"
              element={
                <RequireAuth>
                  <ChatWorkspace />
                </RequireAuth>
              }
            />
            <Route
              path="/chat/:chatId"
              element={
                <RequireAuth>
                  <ChatWorkspace />
                </RequireAuth>
              }
            />
            <Route
              path="/contacts"
              element={
                <RequireAuth>
                  <ContactsPage />
                </RequireAuth>
              }
            />
            <Route
              path="/profile"
              element={
                <RequireAuth>
                  <ProfilePage />
                </RequireAuth>
              }
            />
            <Route
              path="/settings"
              element={
                <RequireAuth>
                  <SettingsPage />
                </RequireAuth>
              }
            />
            <Route path="/404" element={<NotFoundPage />} />
            <Route path="*" element={<Navigate to="/404" replace />} />
          </Routes>
        </BrowserRouter>
      </AppProviders>
    </ErrorBoundary>
  );
}
