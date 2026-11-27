/**
 * ChatHeader - the identity and actions of the open conversation.
 */

import {
  FiArrowLeft,
  FiBellOff,
  FiMoreVertical,
  FiSearch,
  FiUnlock,
} from "react-icons/fi";

import { formatLastSeen } from "../../../core/utils/date.js";
import Avatar from "../../../shared/components/Avatar.jsx";

/**
 * @param {object} props
 * @param {object} props.chat The conversation summary.
 * @param {boolean} props.online
 * @param {boolean} props.typing
 * @param {boolean} props.compact Whether the viewport is narrow.
 * @param {() => void} props.onBack
 * @param {() => void} props.onOpenDetails
 * @param {() => void} props.onOpenSearch
 */
export default function ChatHeader({
  chat,
  online = false,
  typing = false,
  compact = false,
  onBack,
  onOpenDetails,
  onOpenSearch,
}) {
  const other = chat?.otherUser;

  const status = typing
    ? "typing…"
    : online
      ? "Online now"
      : formatLastSeen(other?.lastSeen);

  return (
    <header className="panel__header">
      {compact ? (
        <button
          type="button"
          className="btn btn--ghost btn--icon"
          onClick={onBack}
          aria-label="Back to conversations"
        >
          <FiArrowLeft size={19} />
        </button>
      ) : null}

      <Avatar src={other?.avatar} name={other?.fullName} size="md" online={online} offline={!online} />

      <div className="panel__identity">
        <p className="panel__name truncate">
          {other?.fullName || "Conversation"}
          {chat?.isMuted ? <FiBellOff size={14} aria-label="Muted" /> : null}
          {chat?.isLocked ? <FiUnlock size={14} aria-label="Locked" /> : null}
        </p>
        <p className="panel__meta" data-testid="chat-status">
          {status}
        </p>
      </div>

      <div className="panel__actions">
        <button
          type="button"
          className="btn btn--ghost btn--icon"
          onClick={onOpenSearch}
          aria-label="Search in this conversation"
          title="Search messages"
        >
          <FiSearch size={18} />
        </button>

        <button
          type="button"
          className="btn btn--ghost btn--icon"
          onClick={onOpenDetails}
          aria-label="Conversation details"
          title="Details"
          data-testid="chat-details"
        >
          <FiMoreVertical size={18} />
        </button>
      </div>
    </header>
  );
}
