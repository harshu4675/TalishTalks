/**
 * The application provider stack.
 *
 * The order matters:
 *   ToastProvider   - available to everything, including the auth screen
 *   AuthProvider    - owns the session and configures the HTTP transport
 *   RealtimeProvider- needs the session to authenticate the socket
 *   FriendsProvider - needs the session and realtime events
 *   ChatProvider    - needs the session, realtime events and toasts
 */

import { AuthProvider } from "../core/auth/AuthProvider.jsx";
import { RealtimeProvider } from "../core/realtime/RealtimeProvider.jsx";
import { ChatProvider } from "../features/chat/context/ChatProvider.jsx";
import { FriendsProvider } from "../features/friends/context/FriendsProvider.jsx";
import { ToastProvider } from "../shared/components/ToastProvider.jsx";

/**
 * Wrap the application with every provider it needs.
 */
export default function AppProviders({ children }) {
  return (
    <ToastProvider>
      <AuthProvider>
        <RealtimeProvider>
          <FriendsProvider>
            <ChatProvider>{children}</ChatProvider>
          </FriendsProvider>
        </RealtimeProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
