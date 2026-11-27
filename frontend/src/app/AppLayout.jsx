/**
 * AppLayout - the shell for the standalone pages (contacts, profile, settings).
 *
 * It keeps the navigation rail in place so moving between the messaging
 * surface and these pages never loses the way back, and it provides the
 * consistent page header used by all of them. On narrow viewports the rail
 * is replaced by a compact top bar.
 */

import { FiArrowLeft } from "react-icons/fi";
import { useNavigate } from "react-router-dom";

import AppRail from "../features/chat/components/AppRail.jsx";
import Avatar from "../shared/components/Avatar.jsx";
import { useAuth } from "../core/auth/useAuth.js";

/**
 * @param {object} props
 * @param {string} props.eyebrow A small label above the title.
 * @param {string} props.title The page title.
 * @param {string} [props.subtitle] A sentence under the title.
 * @param {import('react').ReactNode} props.children The page body.
 */
export default function AppLayout({
  eyebrow,
  title,
  subtitle,
  children,
  actions,
  contentWidth = 860,
}) {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="app-shell app-shell--page">
      <AppRail onOpenProfile={() => navigate("/profile")} />

      <main className="page">
        <header className="page-topbar">
          <button
            type="button"
            className="btn btn--ghost btn--icon"
            onClick={() => navigate("/")}
            aria-label="Back to chats"
          >
            <FiArrowLeft size={19} />
          </button>
          <span className="page-topbar__title truncate">{title}</span>
          <Avatar src={user?.avatar} name={user?.fullName} size="sm" />
        </header>

        <div className="page__inner">
          <div className="page__content" style={{ maxWidth: contentWidth }}>
            <header className="page__header">
              {eyebrow ? <p className="page__eyebrow">{eyebrow}</p> : null}
              <h1 className="page__title">{title}</h1>
              {subtitle ? <p className="page__subtitle">{subtitle}</p> : null}
              {actions ? <div style={{ marginTop: "var(--space-4)" }}>{actions}</div> : null}
            </header>

            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
