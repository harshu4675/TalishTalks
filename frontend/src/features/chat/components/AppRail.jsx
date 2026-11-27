import { FiMessageSquare, FiSettings, FiUser, FiUsers } from "react-icons/fi";
import { NavLink, useLocation } from "react-router-dom";

import { useAuth } from "../../../core/auth/useAuth.js";
import { useChats } from "../context/useChats.js";
import { useFriends } from "../../friends/context/useFriends.js";
import Avatar from "../../../shared/components/Avatar.jsx";
import { Logo } from "../../../shared/components/Feedback.jsx";

export default function AppRail({ onOpenProfile }) {
  const { user } = useAuth();
  const { totalUnread } = useChats();
  const { pendingCount } = useFriends();
  const location = useLocation();
  const inThread = /^\/chat\/[^/]+/.test(location.pathname);

  const items = [
    { to: "/", label: "Chats", icon: <FiMessageSquare size={20} />, badge: totalUnread, end: true },
    { to: "/contacts", label: "Contacts", icon: <FiUsers size={20} />, badge: pendingCount },
    { to: "/settings", label: "Settings", icon: <FiSettings size={20} /> },
  ];
  const mobileItems = [
    ...items.slice(0, 2),
    { to: "/profile", label: "Profile", icon: <FiUser size={19} /> },
    items[2],
  ];

  const renderItem = (item) => <NavLink
    key={item.to}
    to={item.to}
    end={item.end}
    className={({ isActive }) => `rail__item ${isActive ? "rail__item--active" : ""}`.trim()}
    title={item.label}
    aria-label={item.label}
  >
    {item.icon}
    {item.badge > 0 ? <span className="rail__badge">{item.badge > 99 ? "99+" : item.badge}</span> : null}
  </NavLink>;

  return <>
    <nav className="rail" aria-label="Primary">
      <NavLink to="/" className="rail__brand-link" aria-label="Talish Talks home"><Logo size={25} /></NavLink>
      <div className="rail__nav">{items.map(renderItem)}</div>
      <div className="rail__spacer" />
      <button type="button" className="rail__avatar" onClick={onOpenProfile} title={user?.fullName ? `Your profile - ${user.fullName}` : "Your profile"} aria-label="Open your profile">
        <Avatar src={user?.avatar} name={user?.fullName} size="md" />
      </button>
    </nav>
    {!inThread ? <nav className="mobile-nav" aria-label="Primary navigation">{mobileItems.map(renderItem)}</nav> : null}
  </>;
}
