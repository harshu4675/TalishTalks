/**
 * Client-generated identifiers.
 *
 * The server deduplicates messages by `clientId`, so the frontend generates
 * one per outgoing message. It must be unique per message but stable across
 * retries, which is why it is created when the message is composed rather
 * than when the request is fired.
 */

/**
 * @returns {string} an identifier that is unique for this browser session.
 */
export const createClientId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  return `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
};

export default createClientId;
