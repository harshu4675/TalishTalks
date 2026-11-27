/**
 * NewChatDialog - pick a friend and open a conversation with them.
 */

import { useMemo, useState } from "react";
import { FiMessageSquare, FiSearch } from "react-icons/fi";

import { useChats } from "../context/useChats.js";
import { useFriends } from "../../friends/context/useFriends.js";
import Avatar from "../../../shared/components/Avatar.jsx";
import Button from "../../../shared/components/Button.jsx";
import { EmptyState, Spinner } from "../../../shared/components/Feedback.jsx";
import { Input } from "../../../shared/components/Field.jsx";
import Modal from "../../../shared/components/Modal.jsx";
import { useToast } from "../../../shared/components/useToast.js";

/**
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {(chat: object) => void} props.onCreated Called with the new chat.
 */
export default function NewChatDialog({ open, onClose, onCreated }) {
  const { friends, isLoading } = useFriends();
  const { startChatWith } = useChats();
  const toast = useToast();

  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState(null);

  const visibleFriends = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return friends;
    return friends.filter(
      (friend) =>
        friend.fullName?.toLowerCase().includes(needle) ||
        friend.username?.toLowerCase().includes(needle),
    );
  }, [friends, query]);

  const handleSelect = async (friend) => {
    setBusyId(friend._id);
    try {
      const chat = await startChatWith(friend._id);
      onCreated?.(chat);
      onClose();
    } catch (error) {
      toast.error("Could not open the conversation", error.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New conversation"
      subtitle="Choose a contact to start talking to."
    >
      <div style={{ display: "grid", gap: "var(--space-4)" }}>
        <Input
          type="search"
          placeholder="Search your contacts"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          icon={<FiSearch size={16} />}
          aria-label="Search your contacts"
          autoFocus
        />

        {isLoading ? (
          <div style={{ display: "grid", placeItems: "center", padding: "var(--space-8)" }}>
            <Spinner />
          </div>
        ) : visibleFriends.length === 0 ? (
          <EmptyState
            icon={<FiMessageSquare size={26} />}
            title={query ? "No contacts match" : "No contacts yet"}
            message={
              query
                ? "Try a different name or username."
                : "Add a friend from the Contacts page to start chatting."
            }
          />
        ) : (
          <ul style={{ display: "grid", gap: 4, maxHeight: 340, overflowY: "auto" }}>
            {visibleFriends.map((friend) => (
              <li key={friend._id}>
                <button
                  type="button"
                  className="menu__item"
                  onClick={() => handleSelect(friend)}
                  disabled={busyId === friend._id}
                  style={{ padding: "var(--space-2) var(--space-3)" }}
                >
                  <Avatar
                    src={friend.avatar}
                    name={friend.fullName}
                    size="sm"
                    online={friend.isOnline}
                    offline={!friend.isOnline}
                  />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontWeight: "var(--weight-semibold)" }}>
                      {friend.fullName}
                    </span>
                    <span style={{ display: "block", color: "var(--text-tertiary)", fontSize: "var(--text-xs)" }}>
                      @{friend.username}
                    </span>
                  </span>
                  {busyId === friend._id ? <Spinner size="sm" /> : null}
                </button>
              </li>
            ))}
          </ul>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}
