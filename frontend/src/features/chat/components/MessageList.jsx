/**
 * MessageList - the scrollable conversation history.
 */

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { FiArrowDown, FiMessageSquare } from "react-icons/fi";

import { formatDaySeparator, groupByDay } from "../../../core/utils/date.js";
import { Button } from "../../../shared/components/index.js";
import { EmptyState, Skeleton } from "../../../shared/components/Feedback.jsx";
import MessageBubble from "./MessageBubble.jsx";

/**
 * @param {object} props
 * @param {object[]} props.messages
 * @param {string} props.viewerId
 * @param {boolean} props.loading
 * @param {boolean} props.hasMore
 * @param {() => void} props.onLoadMore
 * @param {(message: object) => void} props.onReply
 * @param {(message: object) => void} props.onEdit
 * @param {(message: object, scope: string) => void} props.onDelete
 */
export default function MessageList({
  messages,
  viewerId,
  loading = false,
  hasMore = false,
  onLoadMore,
  onReply,
  onEdit,
  onDelete,
}) {
  const scrollerRef = useRef(null);
  const bottomRef = useRef(null);
  const [atBottom, setAtBottom] = useState(true);

  // Keep the view pinned to the newest message as the thread grows.
  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const distance = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight;
    if (distance < 160) {
      bottomRef.current?.scrollIntoView({ block: "end" });
    }
  }, [messages.length]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return undefined;
    const handleScroll = () => {
      const distance = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight;
      setAtBottom(distance < 120);
    };
    scroller.addEventListener("scroll", handleScroll, { passive: true });
    return () => scroller.removeEventListener("scroll", handleScroll);
  }, []);

  const groups = groupByDay(messages);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  };

  if (loading && messages.length === 0) {
    return (
      <div className="thread__scroller">
        <div className="thread__inner" style={{ gap: "var(--space-3)" }}>
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} width={index % 2 ? "45%" : "60%"} height={44} radius="var(--radius-lg)" />
          ))}
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="thread__scroller">
        <EmptyState
          icon={<FiMessageSquare size={26} />}
          title="No messages yet"
          message="Say hello - your first message starts the conversation."
        />
      </div>
    );
  }

  return (
    <div className="thread__scroller" ref={scrollerRef} data-testid="message-list">
      <div className="thread__inner">
        {hasMore ? (
          <div style={{ display: "grid", placeItems: "center", padding: "var(--space-3) 0" }}>
            <Button variant="ghost" size="sm" onClick={onLoadMore}>
              Load earlier messages
            </Button>
          </div>
        ) : null}

        {groups.map((group) => (
          <div key={group.date?.toISOString?.() ?? "group"} style={{ display: "contents" }}>
            <div className="thread__day">{formatDaySeparator(group.date)}</div>

            {group.messages.map((message, index) => {
              const previous = group.messages[index - 1];
              const outgoing = String(message.sender?._id || message.sender) === String(viewerId);
              const grouped =
                Boolean(previous) &&
                String(previous.sender?._id || previous.sender) ===
                  String(message.sender?._id || message.sender) &&
                new Date(message.createdAt) - new Date(previous.createdAt) < 5 * 60 * 1000;

              return (
                <MessageBubble
                  key={message._id}
                  message={message}
                  outgoing={outgoing}
                  grouped={grouped}
                  viewerId={viewerId}
                  onReply={onReply}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              );
            })}
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {!atBottom ? (
        <button
          type="button"
          onClick={scrollToBottom}
          aria-label="Scroll to the latest message"
          style={{
            position: "absolute",
            right: "var(--space-5)",
            bottom: "calc(var(--space-4) + 80px)",
            display: "grid",
            placeItems: "center",
            width: 40,
            height: 40,
            borderRadius: "50%",
            background: "var(--surface-raised)",
            border: "1px solid var(--border-subtle)",
            boxShadow: "var(--shadow-md)",
            color: "var(--text-secondary)",
            zIndex: 5,
          }}
        >
          <FiArrowDown size={18} />
        </button>
      ) : null}
    </div>
  );
}
