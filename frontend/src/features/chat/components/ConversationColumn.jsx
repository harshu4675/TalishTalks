/**
 * ConversationColumn - the middle column of the application shell.
 *
 * Holds the search field, the filter chips, the conversation list and the
 * "new conversation" action.
 */

import { useMemo, useState } from "react";
import { FiEdit3, FiMessageSquare, FiSearch } from "react-icons/fi";

import { useDebouncedValue } from "../../../core/hooks/useDebouncedValue.js";
import { useAuth } from "../../../core/auth/useAuth.js";
import { useChats } from "../context/useChats.js";
import { useFriends } from "../../friends/context/useFriends.js";
import Avatar from "../../../shared/components/Avatar.jsx";
import Button from "../../../shared/components/Button.jsx";
import { EmptyState, Skeleton } from "../../../shared/components/Feedback.jsx";
import { Input } from "../../../shared/components/Field.jsx";
import ConversationRow from "./ConversationRow.jsx";
import StoriesStrip from "../../stories/components/StoriesStrip.jsx";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "friends", label: "Friends" },
];

/**
 * @param {object} props
 * @param {string|null} props.activeChatId
 * @param {(chatId: string) => void} props.onSelectChat
 * @param {() => void} props.onNewChat
 */
export default function ConversationColumn({ activeChatId, onSelectChat, onNewChat }) {
  const { user } = useAuth();
  const { chats, loading, typing, isOnline } = useChats();
  const { friends } = useFriends();

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const debouncedQuery = useDebouncedValue(query.trim().toLowerCase(), 150);

  const friendIds = useMemo(() => new Set(friends.map((friend) => String(friend._id))), [friends]);

  const visibleChats = useMemo(() => {
    return chats.filter((chat) => {
      if (filter === "unread" && !(chat.unreadCount > 0)) return false;
      if (filter === "friends" && !friendIds.has(String(chat.otherUser?._id))) return false;
      if (!debouncedQuery) return true;
      const name = chat.otherUser?.fullName || "";
      const username = chat.otherUser?.username || "";
      return (
        name.toLowerCase().includes(debouncedQuery) ||
        username.toLowerCase().includes(debouncedQuery)
      );
    });
  }, [chats, filter, debouncedQuery, friendIds]);

  return (
    <aside className="column" aria-label="Conversations">
      <header className="column__header">
        <Avatar src={user?.avatar} name={user?.fullName} size="md" />
        <div className="column__heading">
          <h1 className="column__title">Chats</h1>
          <p className="column__subtitle">
            {chats.length} conversation{chats.length === 1 ? "" : "s"}
          </p>
        </div>
        <Button
          variant="soft"
          size="sm"
          iconOnly
          onClick={onNewChat}
          aria-label="Start a new conversation"
          title="New conversation"
        >
          <FiEdit3 size={17} />
        </Button>
      </header>

      <div className="column__search">
        <Input
          type="search"
          placeholder="Search conversations"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          icon={<FiSearch size={16} />}
          aria-label="Search conversations"
          data-testid="conversation-search"
        />
      </div>

      <StoriesStrip />

      <div className="column__filters" role="tablist" aria-label="Filter conversations">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={filter === item.id}
            className={`btn btn--sm ${
              filter === item.id ? "btn--soft" : "btn--ghost"
            }`.trim()}
            onClick={() => setFilter(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="column__body">
        {loading ? (
          <div style={{ padding: "var(--space-4)", display: "grid", gap: "var(--space-4)" }}>
            {[0, 1, 2, 3, 4].map((index) => (
              <div key={index} style={{ display: "flex", gap: "var(--space-3)" }}>
                <Skeleton width={56} height={56} circle />
                <div style={{ flex: 1, display: "grid", gap: 8, paddingTop: 6 }}>
                  <Skeleton width="45%" height={12} />
                  <Skeleton width="70%" height={10} />
                </div>
              </div>
            ))}
          </div>
        ) : visibleChats.length === 0 ? (
          <EmptyState
            icon={<FiMessageSquare size={26} />}
            title={query || filter !== "all" ? "No conversations found" : "No conversations yet"}
            message={
              query || filter !== "all"
                ? "Try a different search or filter."
                : "Start a conversation with one of your contacts to see it here."
            }
            action={
              !query && filter === "all" ? (
                <Button variant="soft" size="sm" onClick={onNewChat}>
                  New conversation
                </Button>
              ) : null
            }
          />
        ) : (
          <div className="conversation-list" role="list">
            {visibleChats.map((chat) => (
              <ConversationRow
                key={chat._id}
                chat={chat}
                active={chat._id === activeChatId}
                viewerId={user?._id}
                online={isOnline(chat.otherUser?._id)}
                typing={Boolean(typing[chat._id])}
                onSelect={() => onSelectChat(chat._id)}
              />
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
