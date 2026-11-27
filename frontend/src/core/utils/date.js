/**
 * Date and time helpers.
 *
 * The chat surface needs several granularities: "now", "2m", a clock time, a
 * weekday, and a full date. These helpers keep the formatting consistent and
 * locale-aware.
 */

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
});

const weekdayFormatter = new Intl.DateTimeFormat(undefined, { weekday: "long" });

const shortDateFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
});

const fullDateFormatter = new Intl.DateTimeFormat(undefined, {
  month: "long",
  day: "numeric",
  year: "numeric",
});

const toDate = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

/** True when both timestamps fall on the same calendar day. */
export const isSameDay = (a, b) => {
  const first = toDate(a);
  const second = toDate(b);
  if (!first || !second) return false;
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
};

/** The calendar day of `reference`, truncated to midnight. */
export const startOfDay = (reference) => {
  const date = toDate(reference);
  if (!date) return null;
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
};

/**
 * A compact "how long ago" label used in conversation lists.
 * @param {string|Date} value
 * @param {Date} [now] Injectable clock, used by tests.
 */
export const relativeTime = (value, now = new Date()) => {
  const date = toDate(value);
  if (!date) return "";
  const diff = now.getTime() - date.getTime();

  if (diff < 0) return timeFormatter.format(date);
  if (diff < MINUTE) return "now";
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h`;
  if (diff < WEEK) return `${Math.floor(diff / DAY)}d`;
  return shortDateFormatter.format(date);
};

/** Clock time for a message bubble, e.g. "14:05". */
export const formatTime = (value) => {
  const date = toDate(value);
  return date ? timeFormatter.format(date) : "";
};

/** The separator label between groups of messages. */
export const formatDaySeparator = (value, now = new Date()) => {
  const date = toDate(value);
  if (!date) return "";
  const today = startOfDay(now);
  const yesterday = new Date(today.getTime() - DAY);
  const target = startOfDay(date);

  if (target.getTime() === today.getTime()) return "Today";
  if (target.getTime() === yesterday.getTime()) return "Yesterday";
  if (now.getTime() - date.getTime() < WEEK) return weekdayFormatter.format(date);
  return fullDateFormatter.format(date);
};

/** Full date and time, e.g. "March 4, 2026 at 14:05". */
export const formatDateTime = (value) => {
  const date = toDate(value);
  if (!date) return "";
  return `${fullDateFormatter.format(date)} at ${timeFormatter.format(date)}`;
};

/** Human description of a "last seen" timestamp. */
export const formatLastSeen = (value, now = new Date()) => {
  const date = toDate(value);
  if (!date) return "Offline";
  const diff = now.getTime() - date.getTime();
  if (diff < MINUTE) return "Last seen just now";
  if (diff < HOUR) {
    const minutes = Math.floor(diff / MINUTE);
    return `Last seen ${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }
  if (diff < DAY) {
    const hours = Math.floor(diff / HOUR);
    return `Last seen ${hours} hour${hours === 1 ? "" : "s"} ago`;
  }
  if (isSameDay(date, now)) return `Last seen at ${timeFormatter.format(date)}`;
  return `Last seen ${shortDateFormatter.format(date)}`;
};

/** Group messages into day buckets for rendering separators. */
export const groupByDay = (messages) => {
  const groups = [];
  for (const message of messages) {
    const last = groups[groups.length - 1];
    if (last && isSameDay(last.date, message.createdAt)) {
      last.messages.push(message);
    } else {
      groups.push({ date: toDate(message.createdAt), messages: [message] });
    }
  }
  return groups;
};

export default {
  isSameDay,
  startOfDay,
  relativeTime,
  formatTime,
  formatDaySeparator,
  formatDateTime,
  formatLastSeen,
  groupByDay,
};
