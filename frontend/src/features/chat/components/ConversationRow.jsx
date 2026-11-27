/**
 * ConversationRow - a single entry in the conversation list.
 */

import { FiBellOff, FiVolumeX } from "react-icons/fi";

import { PinIcon } from "../../../shared/components/icons.jsx";

import { relativeTime } from "../../../core/utils/date.js";
import { messagePreview } from "../../../core/utils/text.js";
import Avatar from "../../../shared/components/Avatar.jsx";

/**
 * @param {object} props
 * @param {object} props.chat The conversation summary from the API.
 * @param {boolean} props.active Whether this conversation is open.
 * @param {string} props.viewerId
 * @param {boolean} props.online Whether the other participant is online.
 * @param {boolean} props.typing Whether the other participant is typing.
 * @param {() => void} props.onSelect
 */
export default function ConversationRow({
  chat,
  active = false,
  viewerId,
  online = false,
  typing = false,
  onSelect,
}) {
  const other = chat.otherUser;
  const unread = chat.unreadCount || 0;

  return (
    <button
      type="button"
      className={`conversation ${active ? "conversation--active" : ""}`.trim()}
      onClick={onSelect}
      aria-current={active ? "true" : undefined}
      data-testid={`conversation-${other?.username || chat._id}`}
    >
      <Avatar src={other?.avatar} name={other?.fullName} size="lg" online={online} offline={!online} />

      <span className="conversation__body">
        <span className="conversation__top">
          <span className="conversation__name truncate">{other?.fullName || "Unknown"}</span>
          <span className="conversation__time">
            {relativeTime(chat.lastMessage?.createdAt || chat.updatedAt)}
          </span>
        </span>

        <span className="conversation__bottom">
          <span
            className={`conversation__preview truncate ${unread ? "conversation__preview--unread" : ""}`.trim()}
          >
            {typing ? <em style={{ color: "var(--brand-600)" }}>typing…</em> : messagePreview(chat.lastMessage, viewerId)}
          </span>

          <span className="conversation__meta">
            {chat.isPinned ? <PinIcon size={13} aria-label="Pinned" /> : null}
            {chat.isMuted ? <FiBellOff size={13} aria-label="Muted" /> : null}
            {chat.isLocked ? <FiVolumeX size={13} aria-label="Locked" /> : null}
            {unread > 0 ? (
              <span className="badge badge--count">{unread > 99 ? "99+" : unread}</span>
            ) : null}
          </span>
        </span>
      </span>
    </button>
  );
}
