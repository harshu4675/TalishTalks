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
    <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-3)" }}>
      <span
        className="rail__brand"
        style={{
          width: size + 20,
          height: size + 20,
          margin: 0,
          borderRadius: "var(--radius-md)",
        }}
        aria-hidden="true"
      >
        <svg width={size} height={22} viewBox="0 0 24 22" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M12 2C6.48 2 2 5.94 2 10.72c0 2.77 1.45 5.24 3.72 6.85-.16.62-.72 2.3-1.87 3.46 2.2-.18 4.03-1.05 5.05-1.83.99.2 2.04.3 3.1.3 5.52 0 10-3.94 10-8.78C22 5.94 17.52 2 12 2Z"
            fill="currentColor"
          />
          <circle cx="8.2" cy="10.4" r="1.5" fill="var(--brand-700)" />
          <circle cx="15.8" cy="10.4" r="1.5" fill="var(--brand-700)" />
        </svg>
      </span>
      {withWordmark ? <span className="auth-pitch__wordmark">{wordmark}</span> : null}
    </span>
  );
}

export default Spinner;
