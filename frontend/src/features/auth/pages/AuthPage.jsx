/**
 * AuthPage - the combined sign-in / sign-up screen.
 *
 * The two modes share one canvas so switching between them never loses the
 * surrounding context, and the layout collapses to a single column on small
 * screens.
 */

import { useEffect, useState } from "react";
import { FiLock, FiMessageCircle, FiShield, FiZap } from "react-icons/fi";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../../../core/auth/useAuth.js";
import { LoadingScreen, Logo } from "../../../shared/components/Feedback.jsx";
import SignInForm from "../components/SignInForm.jsx";
import SignUpForm from "../components/SignUpForm.jsx";

const FEATURES = [
  { icon: <FiMessageCircle size={18} />, text: "Instant delivery with typing indicators and read receipts" },
  { icon: <FiShield size={18} />, text: "Private by default - only people you accept can message you" },
  { icon: <FiZap size={18} />, text: "Works on desktop and mobile, online or off" },
];

/**
 * The authentication screen.
 */
export default function AuthPage() {
  const { isAuthenticated, isInitialising } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mode, setMode] = useState(() =>
    location.pathname === "/register" ? "register" : "signin",
  );

  // Keep the URL and the visible form in sync.
  useEffect(() => {
    const next = mode === "register" ? "/register" : "/signin";
    if (location.pathname !== next) {
      navigate(next, { replace: true, state: location.state });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  if (isInitialising) return <LoadingScreen label="Restoring your session" />;

  if (isAuthenticated) {
    return <Navigate to={location.state?.from || "/"} replace />;
  }

  return (
    <main className="auth-canvas">
      <div className="auth-layout">
        <section className="auth-pitch" aria-label="About Talish Talks">
          <div className="auth-pitch__brand">
            <Logo size={26} withWordmark />
          </div>

          <h1 className="auth-pitch__headline">Conversations that feel close.</h1>
          <p className="auth-pitch__lede">
            Talish Talks is a focused place for real conversations - fast delivery, clear
            controls, and a design that stays out of your way.
          </p>

          <div className="auth-pitch__features">
            {FEATURES.map((feature) => (
              <div className="auth-pitch__feature" key={feature.text}>
                <span className="auth-pitch__feature-icon" aria-hidden="true">
                  {feature.icon}
                </span>
                <span>{feature.text}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="auth-card" aria-label={mode === "register" ? "Create account" : "Sign in"}>
          <header className="auth-card__header">
            <p className="page__eyebrow">
              <FiLock size={12} style={{ display: "inline", verticalAlign: "-1px" }} /> Secure access
            </p>
            <h2 className="auth-card__title">
              {mode === "register" ? "Create your account" : "Welcome back"}
            </h2>
            <p className="auth-card__subtitle">
              {mode === "register"
                ? "A few details and you are ready to talk."
                : "Sign in to pick up where you left off."}
            </p>
          </header>

          {mode === "register" ? (
            <SignUpForm onSwitchMode={() => setMode("signin")} />
          ) : (
            <SignInForm onSwitchMode={() => setMode("register")} />
          )}
        </section>
      </div>
    </main>
  );
}
