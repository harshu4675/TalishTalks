/**
 * String helpers used across the chat surface.
 */

/** The initials shown in an avatar when no image is available. */
export const initialsOf = (name) => {
  if (typeof name !== "string") return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

/** The first letter of a name, used for avatar fallbacks. */
export const initialOf = (name) => {
  if (typeof name !== "string") return "?";
  return name.trim().charAt(0).toUpperCase() || "?";
};

/**
 * Build the preview line for a conversation row.
 */
export const messagePreview = (message, viewerId) => {
  if (!message) return "No messages yet";
  if (message.deletedForEveryone) return "This message was deleted";

  const prefix = message.sender && String(message.sender._id || message.sender) === String(viewerId)
    ? "You: "
    : "";

  if (message.messageType === "image") return `${prefix}Photo`;
  if (message.messageType === "video") return `${prefix}Video`;

  const content = (message.content || "").trim();
  if (!content) return `${prefix}Attachment`;
  return `${prefix}${content}`;
};

/** Truncate a string to `limit` characters, appending an ellipsis. */
export const truncate = (value, limit = 80) => {
  if (typeof value !== "string") return "";
  return value.length <= limit ? value : `${value.slice(0, limit - 1).trimEnd()}…`;
};

/** Case-insensitive "contains" test. */
export const matches = (haystack, needle) => {
  if (!needle) return true;
  return String(haystack || "").toLowerCase().includes(String(needle).toLowerCase());
};

/** Format a byte count for display. */
export const formatBytes = (bytes) => {
  const value = Number(bytes);
  if (!Number.isFinite(value) || value <= 0) return "";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

/** Strip HTML tags from a string (used for pasted content). */
export const stripHtml = (value) =>
  typeof value === "string" ? value.replace(/<[^>]*>/g, "") : "";

/** Normalise a pasted value into plain text with collapsed whitespace. */
export const normaliseMultiline = (value) => stripHtml(value).replace(/\r\n/g, "\n");

export default {
  initialsOf,
  initialOf,
  messagePreview,
  truncate,
  matches,
  formatBytes,
  stripHtml,
  normaliseMultiline,
};
