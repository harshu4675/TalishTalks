/**
 * MessageComposer - the message input bar.
 *
 * Supports text, media attachments, replies and typing notifications. The
 * textarea grows with its content and submits on Enter (Shift+Enter inserts a
 * newline), which is the behaviour people expect from a desktop chat client.
 */

import { useEffect, useRef, useState } from "react";
import { FiCornerUpLeft, FiImage, FiSend, FiX } from "react-icons/fi";

import config from "../../../core/config.js";
import { normaliseMultiline } from "../../../core/utils/text.js";
import Button from "../../../shared/components/Button.jsx";

const MAX_HEIGHT = 140;

/**
 * @param {object} props
 * @param {(content: string, options: { replyTo: object|null }) => Promise<void>} props.onSend
 * @param {(file: File) => Promise<void>} props.onSendMedia
 * @param {object|null} props.replyTo The message being replied to.
 * @param {() => void} props.onCancelReply
 * @param {boolean} props.disabled
 * @param {(isTyping: boolean) => void} props.onTyping
 */
export default function MessageComposer({
  onSend,
  onSendMedia,
  replyTo = null,
  onCancelReply,
  disabled = false,
  onTyping,
}) {
  const [value, setValue] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimer = useRef(null);
  const lastTypingSignal = useRef(false);

  /* Auto-grow the textarea to fit its content. */
  useEffect(() => {
    const node = textareaRef.current;
    if (!node) return;
    node.style.height = "auto";
    node.style.height = `${Math.min(node.scrollHeight, MAX_HEIGHT)}px`;
  }, [value]);

  /* Focus the composer when a reply is started. */
  useEffect(() => {
    if (replyTo) textareaRef.current?.focus();
  }, [replyTo]);

  const signalTyping = (isTyping) => {
    if (!onTyping) return;
    if (isTyping === lastTypingSignal.current) return;
    lastTypingSignal.current = isTyping;
    onTyping(isTyping);
  };

  const handleChange = (event) => {
    const next = normaliseMultiline(event.target.value);
    setValue(next);
    setError(null);

    if (!onTyping) return;
    signalTyping(next.trim().length > 0);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => signalTyping(false), 2500);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed && attachments.length === 0) return;
    if (trimmed.length > config.maxMessageLength) {
      setError(`Messages can be at most ${config.maxMessageLength} characters.`);
      return;
    }

    setBusy(true);
    setError(null);
    try {
      if (trimmed) await onSend(trimmed, { replyTo });
      for (const file of attachments) {
        await onSendMedia(file, { replyTo });
      }
      setValue("");
      setAttachments([]);
      onCancelReply?.();
      signalTyping(false);
      textareaRef.current?.focus();
    } catch (caught) {
      setError(caught?.message || "Your message could not be sent.");
    } finally {
      setBusy(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSubmit(event);
    }
  };

  const handleFiles = (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    setAttachments((current) => [...current, ...files].slice(0, 4));
    event.target.value = "";
  };

  const removeAttachment = (index) => {
    setAttachments((current) => current.filter((_, position) => position !== index));
  };

  return (
    <div className="composer-wrap">
      {replyTo ? (
        <div className="callout callout--info" style={{ marginBottom: "var(--space-2)" }}>
          <FiCornerUpLeft className="callout__icon" size={16} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontWeight: "var(--weight-semibold)" }}>
              Replying to {replyTo.sender?.fullName || "message"}
            </p>
            <p className="truncate">
              {replyTo.messageType === "image"
                ? "Photo"
                : replyTo.messageType === "video"
                  ? "Video"
                  : replyTo.content}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancelReply}
            aria-label="Cancel reply"
            style={{ color: "var(--text-tertiary)", padding: 4 }}
          >
            <FiX size={16} />
          </button>
        </div>
      ) : null}

      {attachments.length > 0 ? (
        <div className="composer__attachments">
          {attachments.map((file, index) => (
            <div className="composer__attachment" key={`${file.name}-${index}`}>
              {file.type.startsWith("image/") ? (
                <img src={URL.createObjectURL(file)} alt={file.name} />
              ) : (
                <span
                  style={{
                    display: "grid",
                    placeItems: "center",
                    height: "100%",
                    fontSize: "var(--text-2xs)",
                    padding: 4,
                    textAlign: "center",
                  }}
                >
                  {file.name}
                </span>
              )}
              <button
                type="button"
                className="composer__attachment-remove"
                onClick={() => removeAttachment(index)}
                aria-label={`Remove ${file.name}`}
              >
                <FiX size={12} />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <form className="composer" onSubmit={handleSubmit}>
        <button
          type="button"
          className="composer__attach"
          onClick={() => fileInputRef.current?.click()}
          aria-label="Attach an image or video"
          title="Attach"
          disabled={disabled}
        >
          <FiImage size={19} />
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={handleFiles}
          style={{ display: "none" }}
          data-testid="composer-attachment"
        />

        <textarea
          ref={textareaRef}
          className="composer__input"
          rows={1}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={() => signalTyping(false)}
          placeholder={disabled ? "Reconnecting…" : "Write a message…"}
          disabled={disabled}
          aria-label="Message"
          data-testid="composer-input"
        />

        <div className="composer__actions">
          <Button
            type="submit"
            className="composer__send"
            iconOnly
            variant="primary"
            loading={busy}
            disabled={disabled || (!value.trim() && attachments.length === 0)}
            aria-label="Send message"
            data-testid="composer-send"
          >
            <FiSend size={17} />
          </Button>
        </div>
      </form>

      {error ? (
        <p className="composer__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
