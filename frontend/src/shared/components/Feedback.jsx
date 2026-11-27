/**
 * Small presentational primitives: spinner, empty state, skeleton and logo.
 */

import { FiInbox } from "react-icons/fi";

/** A loading indicator. */
export function Spinner({ size = "md", inverse = false, label = "Loading" }) {
  const sizeClass = size === "sm" ? "spinner--sm" : "";
  const inverseClass = inverse ? "spinner--inverse" : "";
  return (
    <span
      className={`spinner ${sizeClass} ${inverseClass}`.trim()}
      role="status"
      aria-label={label}
    />
  );
}

/**
 * An empty state with an icon, a heading and an optional action.
 */
export function EmptyState({ icon, title, message, action, compact = false }) {
  return (
    <div className="empty" style={compact ? { padding: "var(--space-6)" } : undefined}>
      <span className="empty__icon" aria-hidden="true">
        {icon ?? <FiInbox size={26} />}
      </span>
      {title ? <p className="empty__title">{title}</p> : null}
      {message ? <p className="empty__text">{message}</p> : null}
      {action}
    </div>
  );
}

/** A shimmering placeholder block. */
export function Skeleton({ width = "100%", height = 12, radius, circle = false, className = "" }) {
  const style = {
    width,
    height,
    ...(radius ? { borderRadius: radius } : {}),
    ...(circle ? { borderRadius: "50%" } : {}),
  };
  return (
    <span
      className={`skeleton ${circle ? "skeleton--circle" : "skeleton--line"} ${className}`.trim()}
      style={style}
      aria-hidden="true"
    />
  );
}

/** The product mark used in the rail, the auth page and the tab title. */
export function Logo({ size = 22, withWordmark = false, wordmark = "Talish Talks" }) {
  return (
    <span className="brand-lockup">
      <span className="brand-mark" style={{ width: size + 20, height: size + 20 }} aria-hidden="true">
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M5 6.5C5 4.57 6.57 3 8.5 3h14C24.43 3 26 4.57 26 6.5v10c0 1.93-1.57 3.5-3.5 3.5H15l-5.5 5v-5H8.5C6.57 20 5 18.43 5 16.5v-10Z" fill="currentColor" />
          <circle cx="11" cy="11.5" r="1.35" fill="var(--surface-raised)" />
          <circle cx="16" cy="11.5" r="1.35" fill="var(--surface-raised)" />
          <circle cx="21" cy="11.5" r="1.35" fill="var(--surface-raised)" />
          <path d="M20 22.5h4.7c1.27 0 2.3-1.03 2.3-2.3v-3.7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </span>
      {withWordmark ? <span className="auth-pitch__wordmark">{wordmark}</span> : null}
    </span>
  );
}

export function LoadingScreen({ label = "Loading Talish Talks" }) {
  return <main className="app-loader" role="status" aria-label={label}>
    <Logo size={26} withWordmark />
    <Spinner />
    <span>{label}</span>
  </main>;
}

export default Spinner;
