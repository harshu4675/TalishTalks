/**
 * MessageSearchDialog - search the text of a conversation.
 */

import { useEffect, useState } from "react";
import { FiSearch } from "react-icons/fi";

import { messageApi } from "../../../core/api/endpoints.js";
import { formatDateTime } from "../../../core/utils/date.js";
import Button from "../../../shared/components/Button.jsx";
import { EmptyState, Spinner } from "../../../shared/components/Feedback.jsx";
import { Input } from "../../../shared/components/Field.jsx";
import Modal from "../../../shared/components/Modal.jsx";
import { useToast } from "../../../shared/components/useToast.js";

/**
 * @param {object} props
 * @param {boolean} props.open
 * @param {object} props.chat
 * @param {() => void} props.onClose
 */
export default function MessageSearchDialog({ open, chat, onClose }) {
  const toast = useToast();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setSearched(false);
    }
  }, [open]);

  const runSearch = async (value) => {
    const trimmed = value.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    try {
      const data = await messageApi.search(trimmed, chat?._id);
      setResults(data.messages || []);
      setSearched(true);
    } catch (error) {
      toast.error("Search failed", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Search messages" subtitle={`In this conversation`}>
      <div style={{ display: "grid", gap: "var(--space-4)" }}>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            runSearch(query);
          }}
          style={{ display: "flex", gap: "var(--space-2)" }}
        >
          <Input
            type="search"
            placeholder="Search for a phrase"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            icon={<FiSearch size={16} />}
            aria-label="Search messages"
            autoFocus
          />
          <Button type="submit" loading={loading} disabled={query.trim().length < 2}>
            Search
          </Button>
        </form>

        {loading ? (
          <div style={{ display: "grid", placeItems: "center", padding: "var(--space-6)" }}>
            <Spinner />
          </div>
        ) : null}

        {!loading && searched && results.length === 0 ? (
          <EmptyState
            icon={<FiSearch size={26} />}
            title="No matches"
            message="Try a different word or phrase."
          />
        ) : null}

        {!loading && results.length > 0 ? (
          <ul style={{ display: "grid", gap: "var(--space-2)", maxHeight: 360, overflowY: "auto" }}>
            {results.map((message) => (
              <li
                key={message._id}
                className="card"
                style={{ padding: "var(--space-3)", boxShadow: "none" }}
              >
                <p style={{ fontSize: "var(--text-sm)" }}>{message.content}</p>
                <p style={{ marginTop: 4, fontSize: "var(--text-xs)", color: "var(--text-tertiary)" }}>
                  {message.sender?.fullName || "Unknown"} · {formatDateTime(message.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </Modal>
  );
}
