export const senderId = (message) => message?.sender?._id || message?.sender;
export const messageTime = (message) => new Date(message?.createdAt || 0).getTime();
export const compareMessages = (a, b) => messageTime(a) - messageTime(b) || String(a._id).localeCompare(String(b._id));

// Stable database IDs, plus clientId reconciliation for an HTTP response racing its socket event.
export function mergeMessages(previous, incoming, removed = new Set()) {
  const records = new Map();
  for (const message of previous) {
    if (!removed.has(message._id)) records.set(message._id, message);
  }
  for (const message of Array.isArray(incoming) ? incoming : [incoming]) {
    if (!message?._id || removed.has(message._id)) continue;
    const old = records.get(message._id);
    if (old?.editedAt && message.editedAt && new Date(old.editedAt) > new Date(message.editedAt)) continue;
    records.set(message._id, { ...old, ...message, isOptimistic: false, failed: false });
    if (message.clientId) {
      for (const [id, candidate] of records) {
        if (id !== message._id && candidate.clientId === message.clientId) records.delete(id);
      }
    }
  }
  return [...records.values()].sort(compareMessages);
}

export const sortChats = (chats) => [...chats].sort((a, b) =>
  Number(!!b.isPinned) - Number(!!a.isPinned) ||
  messageTime(b.lastMessage || { createdAt: b.updatedAt || b.createdAt }) - messageTime(a.lastMessage || { createdAt: a.updatedAt || a.createdAt }) ||
  String(b._id).localeCompare(String(a._id)));

export const errorMessage = (error, fallback = "Something went wrong. Please try again.") =>
  error?.response?.data?.message || (error?.request ? "Cannot reach the server. Check your connection and try again." : fallback);
