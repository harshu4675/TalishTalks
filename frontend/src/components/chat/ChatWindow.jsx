import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import ChatHeader from "./ChatHeader";
import ChatInput from "./ChatInput";
import ChatBubble from "./ChatBubble";
import TypingIndicator from "./TypingIndicator";
import { messageAPI } from "../../services/api";
import { useAuth } from "../../hooks/useAuth";
import { useSocket } from "../../hooks/useSocket";
import { useChat } from "../../hooks/useChat";

const ChatWindow = ({ chat, onBack }) => {
  const { user } = useAuth();
  const { isUserOnline, emitTypingStart, emitTypingStop } = useSocket();
  const {
    messages,
    setMessages,
    addMessage,
    loadingMessages,
    setLoadingMessages,
    typingUsers,
    resetUnread,
    updateLastMessage,
    removeMessage,
  } = useChat();

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const [sending, setSending] = useState(false);

  const otherUser = chat.otherUser;
  const isOnline = isUserOnline(otherUser._id);
  const isTyping = typingUsers[chat._id] === otherUser._id;

  // Find the LAST message sent by current user that has been seen
  // This is used to show "Seen" indicator only on the last seen message
  const lastSeenOwnMessageId = (() => {
    const ownSeenMessages = messages.filter((m) => {
      const senderId = typeof m.sender === "object" ? m.sender._id : m.sender;
      return (
        senderId === user._id && m.status === "seen" && !m.deletedForEveryone
      );
    });
    return ownSeenMessages.length > 0
      ? ownSeenMessages[ownSeenMessages.length - 1]._id
      : null;
  })();

  // Fetch messages when chat changes
  useEffect(() => {
    const fetchMessages = async () => {
      setLoadingMessages(true);
      try {
        const res = await messageAPI.get(chat._id);
        setMessages(res.data.messages || []);
        await messageAPI.markSeen(chat._id);
        resetUnread(chat._id);
      } catch (err) {
        console.error("Failed to fetch messages:", err);
        toast.error("Failed to load messages");
      } finally {
        setLoadingMessages(false);
      }
    };

    if (chat?._id) {
      fetchMessages();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat?._id]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping]);

  // Mark messages as seen when new ones arrive
  useEffect(() => {
    if (!chat?._id || messages.length === 0) return;

    const hasUnseen = messages.some((m) => {
      const senderId = typeof m.sender === "object" ? m.sender._id : m.sender;
      return senderId !== user._id && m.status !== "seen";
    });

    if (hasUnseen) {
      messageAPI.markSeen(chat._id).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, chat?._id]);

  // Send message
  const handleSend = async (content) => {
    setSending(true);
    try {
      const res = await messageAPI.send({
        chatId: chat._id,
        content,
      });
      addMessage(res.data.data);
      updateLastMessage(chat._id, res.data.data);
    } catch (err) {
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleTypingStart = () => emitTypingStart(chat._id, otherUser._id);
  const handleTypingStop = () => emitTypingStop(chat._id, otherUser._id);

  const handleDeleteForMe = async (messageId) => {
    try {
      await messageAPI.deleteForMe(messageId);
      removeMessage(messageId);
      toast.success("Message deleted");
    } catch (err) {
      toast.error("Failed to delete message");
    }
  };

  const handleDeleteForEveryone = async (messageId) => {
    if (!window.confirm("Delete this message for everyone?")) return;
    try {
      await messageAPI.deleteForEveryone(messageId);
    } catch (err) {
      toast.error("Failed to delete message");
    }
  };

  // Group messages by date
  const groupMessagesByDate = (msgs) => {
    const groups = [];
    let currentDate = null;
    let currentGroup = null;

    msgs.forEach((msg) => {
      const msgDate = new Date(msg.createdAt).toDateString();
      if (msgDate !== currentDate) {
        currentDate = msgDate;
        currentGroup = { date: msgDate, messages: [] };
        groups.push(currentGroup);
      }
      currentGroup.messages.push(msg);
    });

    return groups;
  };

  const formatDateLabel = (dateStr) => {
    const date = new Date(dateStr);
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    if (dateStr === today) return "Today";
    if (dateStr === yesterday) return "Yesterday";
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
  };
  // Filter out deleted/disappeared messages BEFORE grouping
  const visibleMessages = messages.filter((m) => !m.deletedForEveryone);
  const messageGroups = groupMessagesByDate(visibleMessages);

  return (
    <div
      className="flex flex-col h-full"
      style={{ backgroundColor: "var(--color-bg)" }}
    >
      {/* Header */}
      <ChatHeader
        chat={chat}
        isOnline={isOnline}
        isTyping={isTyping}
        onBack={onBack}
        onChatCleared={() => setMessages([])}
      />

      {/* Messages — Themed Background */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-2 relative"
        style={{
          backgroundColor: "var(--color-bg)",
        }}
      >
        {/* Decorative themed background pattern */}
        <div
          className="absolute inset-0 pointer-events-none opacity-30"
          style={{
            backgroundImage: `
              radial-gradient(circle at 20% 30%, var(--color-primary) 0%, transparent 8%),
              radial-gradient(circle at 80% 70%, var(--color-secondary) 0%, transparent 8%),
              radial-gradient(circle at 50% 50%, var(--color-primary) 0%, transparent 10%)
            `,
            opacity: 0.05,
          }}
        />

        {/* Content */}
        <div className="relative z-10">
          {loadingMessages ? (
            <div className="space-y-3 p-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className={`flex ${
                    i % 2 === 0 ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`h-10 skeleton ${
                      i % 2 === 0
                        ? "rounded-2xl rounded-br-md"
                        : "rounded-2xl rounded-bl-md"
                    }`}
                    style={{ width: `${Math.random() * 100 + 100}px` }}
                  />
                </div>
              ))}
            </div>
          ) : visibleMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-20">
              <div className="text-6xl mb-4 animate-float">💬</div>
              <p
                className="font-semibold mb-1"
                style={{ color: "var(--color-text)" }}
              >
                Start the conversation
              </p>
              <p
                className="text-sm"
                style={{ color: "var(--color-textMuted)" }}
              >
                Send your first message to {otherUser.fullName}
              </p>
            </div>
          ) : (
            <>
              {messageGroups.map((group) => (
                <div key={group.date} className="space-y-2">
                  {/* Date separator */}
                  <div className="flex items-center justify-center my-4">
                    <div
                      className="px-3 py-1 rounded-full text-[11px]"
                      style={{
                        backgroundColor: "var(--color-bgCard)",
                        color: "var(--color-textMuted)",
                        border: "1px solid var(--color-border)",
                      }}
                    >
                      {formatDateLabel(group.date)}
                    </div>
                  </div>

                  {/* Messages */}
                  <AnimatePresence>
                    {group.messages.map((message) => {
                      const senderId =
                        typeof message.sender === "object"
                          ? message.sender._id
                          : message.sender;
                      const isOwn = senderId === user._id;
                      const isLastSeen = message._id === lastSeenOwnMessageId;

                      return (
                        <ChatBubble
                          key={message._id}
                          message={message}
                          isOwn={isOwn}
                          isLastSeen={isLastSeen}
                          onDeleteForMe={handleDeleteForMe}
                          onDeleteForEveryone={handleDeleteForEveryone}
                        />
                      );
                    })}
                  </AnimatePresence>
                </div>
              ))}

              {/* Typing indicator */}
              <AnimatePresence>
                {isTyping && (
                  <TypingIndicator name={otherUser.fullName.split(" ")[0]} />
                )}
              </AnimatePresence>
            </>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <ChatInput
        onSend={handleSend}
        onTypingStart={handleTypingStart}
        onTypingStop={handleTypingStop}
        disabled={sending}
      />
    </div>
  );
};

export default ChatWindow;
