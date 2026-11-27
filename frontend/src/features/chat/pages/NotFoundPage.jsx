/**
 * NotFoundPage - shown for unknown routes.
 */

import { FiCompass } from "react-icons/fi";
import { Link } from "react-router-dom";

import { Logo } from "../../../shared/components/Feedback.jsx";

/**
 * A friendly 404 screen.
 */
export default function NotFoundPage() {
  return (
    <main className="auth-canvas">
      <div className="auth-card" style={{ maxWidth: 480, textAlign: "center" }}>
        <Logo size={26} withWordmark />
        <div style={{ marginTop: "var(--space-6)" }}>
          <p className="page__eyebrow">Error 404</p>
          <h1 className="auth-card__title">This page went quiet</h1>
          <p className="auth-card__subtitle">
            The link you followed does not lead anywhere in Talish Talks.
          </p>
        </div>
        <div style={{ marginTop: "var(--space-6)" }}>
          <Link to="/" className="btn btn--primary">
            <FiCompass size={16} /> Back to your chats
          </Link>
        </div>
      </div>
    </main>
  );
}
