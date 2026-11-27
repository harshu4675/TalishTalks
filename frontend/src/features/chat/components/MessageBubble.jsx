/**
 * MessageBubble - one message in a conversation.
 */

import { useRef, useState } from "react";
import { FiCheck, FiClock, FiCornerUpLeft, FiEdit3, FiMoreVertical, FiTrash2 } from "react-icons/fi";

import { formatTime } from "../../../core/utils/date.js";
import Avatar from "../../../shared/components/Avatar.jsx";
import Menu from "../../../shared/components/Menu.jsx";
import { DoubleCheckIcon } from "../../../shared/components/icons.jsx";

/**
 * @param {object} props
 * @param {object} props.message The message record.
 * @param {boolean} props.outgoing Whether the viewer sent it.
 * @param {boolean} props.grouped Whether it continues the previous bubble.
 * @param {(message: object) => void} [props.onReply]
 * @param {(message: object) => void} [props.onEdit]
 * @param {(message: object, scope: string) => void} [props.onDelete]
 */
export default function MessageBubble({
  message,
  outgoing = false,
  grouped = false,
  onReply,
  onEdit,
  onDelete,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const actionsRef = useRef(null);

  const isFailed = message.status === "failed";
  const isPending = message.status === "sending";
  const isSeen = message.status === "seen";

  const statusIcon = isFailed ? (
    <FiClock size={13} aria-label="Not sent" />
  ) : isSeen ? (
    <DoubleCheckIcon size={14} className="message__status--seen" aria-label="Seen" />
  ) : isPending ? (
    <FiClock size={13} aria-label="Sending" />
  ) : (
    <FiCheck size={14} className="message__status--sent" aria-label="Sent" />
  );

  const canEdit = outgoing && message.messageType === "text" && !message.deletedForEveryone && !isPending;
  const canDeleteForEveryone = canEdit;
  const canDeleteForMe = !message.deletedForEveryone;

  return (
    <div
      className={`message ${outgoing ? "message--outgoing" : ""} ${grouped ? "message--grouped" : ""}`.trim()}
      data-testid={outgoing ? "message-outgoing" : "message-incoming"}
      data-message-id={message._id}
    >
      {!grouped ? (
        <span className="message__avatar-slot">
          {!outgoing ? (
            <Avatar src={message.sender?.avatar} name={message.sender?.fullName} size="sm" />
          ) : null}
        </span>
      ) : null}

      <div className="message__stack">
        {message.replyTo ? (
          <span className="message__reply">
            <strong>{message.replyTo.sender?.fullName || "Message"}: </strong>
            {message.replyTo.messageType === "image"
              ? "📷 Photo"
              : message.replyTo.messageType === "video"
                ? "🎬 Video"
                : message.replyTo.content}
          </span>
        ) : null}

        <div
          className="message__bubble"
          style={isFailed ? { borderColor: "var(--danger-500)" } : undefined}
        >
          {message.messageType === "image" && message.media?.url ? (
            <span className="message__media">
              <img src={message.media.url} alt="Shared image" loading="lazy" />
            </span>
          ) : null}

          {message.messageType === "video" && message.media?.url ? (
            <span className="message__media">
              <video src={message.media.url} controls preload="metadata" />
            </span>
          ) : null}

          {message.content ? <span>{message.content}</span> : null}

          {message.edited ? <span className="message__edited"> · edited</span> : null}
        </div>

        <div className="message__meta">
          <span>{formatTime(message.createdAt)}</span>
          {outgoing ? <span className="message__status">{statusIcon}</span> : null}
          {isFailed ? <span style={{ color: "var(--danger-600)" }}>Not sent</span> : null}
        </div>
      </div>

      {!message.deletedForEveryone ? (
        <div className="message__actions" ref={actionsRef}>
          {onReply ? (
            <button
              type="button"
              className="message__action"
              onClick={() => onReply(message)}
              aria-label="Reply to this message"
              title="Reply"
            >
              <FiCornerUpLeft size={14} />
            </button>
          ) : null}

          <button
            type="button"
            className="message__action"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="More actions"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            title="More"
          >
            <FiMoreVertical size={14} />
          </button>

          <Menu
            open={menuOpen}
            anchorRef={actionsRef}
            onClose={() => setMenuOpen(false)}
          >
            {onReply ? (
              <button
                type="button"
                className="menu__item"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onReply(message);
                }}
              >
                <FiCornerUpLeft size={15} /> Reply
              </button>
            ) : null}

            {canEdit ? (
              <button
                type="button"
                className="menu__item"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onEdit?.(message);
                }}
              >
                <FiEdit3 size={15} /> Edit
              </button>
            ) : null}

            {canDeleteForMe ? (
              <button
                type="button"
                className="menu__item menu__item--danger"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onDelete?.(message, "me");
                }}
              >
                <FiTrash2 size={15} /> Delete for me
              </button>
            ) : null}

            {canDeleteForEveryone ? (
              <button
                type="button"
                className="menu__item menu__item--danger"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onDelete?.(message, "everyone");
                }}
              >
                <FiTrash2 size={15} /> Delete for everyone
              </button>
            ) : null}
          </Menu>
        </div>
      ) : null}
    </div>
  );
}
