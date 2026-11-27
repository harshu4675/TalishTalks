/**
 * ChatPanel - the open conversation: header, history and composer.
 */

import { useCallback, useEffect, useState } from "react";
import { FiMessageSquare } from "react-icons/fi";

import { useAuth } from "../../../core/auth/useAuth.js";
import { useIsCompact } from "../../../core/hooks/useMediaQuery.js";
import { useChats } from "../context/useChats.js";
import Button from "../../../shared/components/Button.jsx";
import { EmptyState } from "../../../shared/components/Feedback.jsx";
import Modal from "../../../shared/components/Modal.jsx";
import { useToast } from "../../../shared/components/useToast.js";
import ChatDetailsDialog from "./ChatDetailsDialog.jsx";
import ChatHeader from "./ChatHeader.jsx";
import MessageComposer from "./MessageComposer.jsx";
import MessageList from "./MessageList.jsx";
import MessageSearchDialog from "./MessageSearchDialog.jsx";

/**
 * @param {object} props
 * @param {object|null} props.chat The open conversation.
 * @param {() => void} props.onBack
 * @param {(chatId: string|null) => void} props.onChatClosed
 */
export default function ChatPanel({ chat, onBack, onChatClosed, mobileOpen = false }) {
  const { user } = useAuth();
  const {
    threads,
    typing,
    isOnline,
    sendMessage,
    sendMedia,
    editMessage,
    deleteMessage,
    loadMessages,
    notifyTyping,
  } = useChats();
  const toast = useToast();
  const compact = useIsCompact();

  const [replyTo, setReplyTo] = useState(null);
  const [editing, setEditing] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const thread = chat ? threads[chat._id] : null;
  const messages = thread?.items ?? [];
  const otherTyping = Boolean(chat && typing[chat._id]);

  /* Reset per-conversation UI state when the open chat changes. */
  useEffect(() => {
    setReplyTo(null);
    setEditing(null);
  }, [chat?._id]);

  const handleSend = useCallback(
    async (content, { replyTo: reply }) => {
      await sendMessage(chat._id, content, { replyTo: reply });
    },
    [chat?._id, sendMessage],
  );

  const handleSendMedia = useCallback(
    async (file, { replyTo: reply }) => {
      await sendMedia(chat._id, file, { replyTo: reply });
    },
    [chat?._id, sendMedia],
  );

  const handleEditSubmit = async (event) => {
    event.preventDefault();
    const content = editing.content.trim();
    if (!content) return;
    try {
      await editMessage(chat._id, editing._id, content);
      setEditing(null);
      toast.success("Message updated");
    } catch (error) {
      toast.error("Could not update the message", error.message);
    }
  };

  const handleDelete = async (message, scope) => {
    try {
      await deleteMessage(chat._id, message._id, scope);
      toast.success(scope === "everyone" ? "Message deleted for everyone" : "Message deleted");
    } catch (error) {
      toast.error("Could not delete the message", error.message);
    }
  };

  if (!chat) {
    return (
      <section className={`panel ${mobileOpen ? "panel--open" : ""}`.trim()} aria-label="Conversation">
        <div className="panel__empty">
          <EmptyState
            icon={<FiMessageSquare size={30} />}
            title="Select a conversation"
            message="Pick someone from the list on the left to start reading and replying."
          />
        </div>
      </section>
    );
  }

  return (
    <section
      className={`panel ${mobileOpen ? "panel--open" : ""}`.trim()}
      aria-label={`Conversation with ${chat.otherUser?.fullName || "contact"}`}
    >
      <ChatHeader
        chat={chat}
        online={isOnline(chat.otherUser?._id)}
        typing={otherTyping}
        compact={compact}
        onBack={onBack}
        onOpenDetails={() => setDetailsOpen(true)}
        onOpenSearch={() => setSearchOpen(true)}
      />

      <div className="panel__body">
        {otherTyping ? (
          <div className="typing" style={{ margin: "var(--space-3) var(--space-5) 0" }} aria-live="polite">
            <span className="typing__dot" />
            <span className="typing__dot" />
            <span className="typing__dot" />
            <span className="sr-only">{chat.otherUser?.fullName} is typing</span>
          </div>
        ) : null}

        <MessageList
          messages={messages}
          viewerId={user?._id}
          loading={thread?.status === "loading"}
          hasMore={thread?.hasMore}
          onLoadMore={() => loadMessages(chat._id, { page: (thread?.page ?? 1) + 1 })}
          onReply={setReplyTo}
          onEdit={(message) => setEditing({ ...message })}
          onDelete={handleDelete}
        />
      </div>

      <div className="thread__composer">
        <div className="thread__composer-inner">
          <MessageComposer
            onSend={handleSend}
            onSendMedia={handleSendMedia}
            replyTo={replyTo}
            onCancelReply={() => setReplyTo(null)}
            onTyping={(isTyping) => notifyTyping(chat._id, isTyping)}
          />
        </div>
      </div>

      {/* Edit a previously sent message. */}
      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Edit message"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={handleEditSubmit}>Save changes</Button>
          </>
        }
      >
        <form onSubmit={handleEditSubmit}>
          <textarea
            className="input"
            value={editing?.content || ""}
            onChange={(event) => setEditing((current) => ({ ...current, content: event.target.value }))}
            rows={4}
            aria-label="Message content"
            autoFocus
          />
        </form>
      </Modal>

      <ChatDetailsDialog
        open={detailsOpen}
        chat={chat}
        onClose={() => setDetailsOpen(false)}
        onRemoved={() => {
          setDetailsOpen(false);
          onChatClosed?.();
        }}
      />

      <MessageSearchDialog open={searchOpen} chat={chat} onClose={() => setSearchOpen(false)} />
    </section>
  );
}
