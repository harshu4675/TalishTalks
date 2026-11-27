/**
 * AppRail - the vertical navigation rail.
 *
 * Gives the application a stable spine: brand mark at the top, primary
 * destinations in the middle, and the signed-in user's identity at the
 * bottom.
 */

import { FiMessageSquare, FiSettings, FiUsers } from "react-icons/fi";
import { NavLink } from "react-router-dom";

import { useAuth } from "../../../core/auth/useAuth.js";
import { useChats } from "../context/useChats.js";
import { useFriends } from "../../friends/context/useFriends.js";
import Avatar from "../../../shared/components/Avatar.jsx";

/**
 * @param {object} props
 * @param {() => void} props.onOpenProfile
 */
export default function AppRail({ onOpenProfile }) {
  const { user } = useAuth();
  const { totalUnread } = useChats();
  const { pendingCount } = useFriends();

  const items = [
    { to: "/", label: "Chats", icon: <FiMessageSquare size={20} />, badge: totalUnread },
    { to: "/contacts", label: "Contacts", icon: <FiUsers size={20} />, badge: pendingCount },
    { to: "/settings", label: "Settings", icon: <FiSettings size={20} /> },
  ];

  return (
    <nav className="rail" aria-label="Primary">
      <span className="rail__brand" aria-hidden="true">
        <svg width="24" height="22" viewBox="0 0 24 22" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M12 2C6.48 2 2 5.94 2 10.72c0 2.77 1.45 5.24 3.72 6.85-.16.62-.72 2.3-1.87 3.46 2.2-.18 4.03-1.05 5.05-1.83.99.2 2.04.3 3.1.3 5.52 0 10-3.94 10-8.78C22 5.94 17.52 2 12 2Z"
            fill="currentColor"
          />
          <circle cx="8.2" cy="10.4" r="1.5" fill="var(--brand-700)" />
          <circle cx="15.8" cy="10.4" r="1.5" fill="var(--brand-700)" />
        </svg>
      </span>

      <div className="rail__nav">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) => `rail__item ${isActive ? "rail__item--active" : ""}`.trim()}
            title={item.label}
            aria-label={item.label}
          >
            {item.icon}
            {item.badge > 0 ? (
              <span className="rail__badge">{item.badge > 99 ? "99+" : item.badge}</span>
            ) : null}
          </NavLink>
        ))}
      </div>

      <div className="rail__spacer" />

      <button
        type="button"
        className="rail__avatar"
        onClick={onOpenProfile}
        title={user?.fullName ? `Your profile - ${user.fullName}` : "Your profile"}
        aria-label="Open your profile"
      >
        <Avatar src={user?.avatar} name={user?.fullName} size="md" />
      </button>
    </nav>
  );
}
