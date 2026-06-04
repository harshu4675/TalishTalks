import React, { useEffect, useRef, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import toast from "react-hot-toast";
import { HiOutlineTrash, HiOutlineX, HiCheck } from "react-icons/hi";
import ChatHeader from "./ChatHeader";
import ChatInput from "./ChatInput";
import ChatBubble from "./ChatBubble";
import TypingIndicator from "./TypingIndicator";
import { messageAPI } from "../../services/api";
import { useAuth } from "../../hooks/useAuth";
import { useSocket } from "../../hooks/useSocket";
import { useChat } from "../../hooks/useChat";
import { useBackButton } from "../../hooks/useBackButton";

const ChatWindow = ({ chat, onBack }) => {
  const { user } = useAuth();
  const { isUserOnline, emitTypingStart, emitTypingStop, socket } = useSocket();
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
  const containerRef = useRef(null);
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState(null);

  // 🔥 Track which chat we're in for cleanup
  const currentChatIdRef = useRef(chat?._id);

  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const otherUser = chat.otherUser;
  const isOnline = isUserOnline(otherUser._id);
  const isTyping = typingUsers[chat._id] === otherUser._id;

  const iBlockedThem = chat.iBlockedThem || false;
  const theyBlockedMe = chat.theyBlockedMe || false;
  const isBlocked = iBlockedThem || theyBlockedMe;

  // 🔥 NEW: Cleanup function — called when leaving chat
  const handleLeaveCleanup = useCallback(async (chatId) => {
    if (!chatId) return;
    try {
      await messageAPI.leaveCleanup(chatId);
    } catch (err) {
      console.error("Leave cleanup failed:", err);
    }
  }, []);

  // 🔥 Wrap onBack to trigger cleanup
  const handleBackWithCleanup = useCallback(() => {
    handleLeaveCleanup(currentChatIdRef.current);
    if (onBack) onBack();
  }, [onBack, handleLeaveCleanup]);

  useBackButton(!!chat, () => {
    if (isSelectMode) {
      exitSelectMode();
      return;
    }
    handleBackWithCleanup();
  });

  // 🔥 Cleanup on unmount or chat change
  useEffect(() => {
    currentChatIdRef.current = chat?._id;

    return () => {
      // When component unmounts OR chat changes, cleanup old chat
      if (currentChatIdRef.current) {
        handleLeaveCleanup(currentChatIdRef.current);
      }
    };
  }, [chat?._id, handleLeaveCleanup]);

  // 🔥 Cleanup on browser close / tab close
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (currentChatIdRef.current) {
        // Use sendBeacon for reliability on page close
        const token = localStorage.getItem("talish_token");
        const url = `${
          import.meta.env.VITE_API_URL || "http://localhost:5000/api"
        }/messages/${currentChatIdRef.current}/leave-cleanup`;

        const blob = new Blob([JSON.stringify({})], {
          type: "application/json",
        });

        // sendBeacon doesn't support headers, so we use fetch with keepalive
        fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          keepalive: true,
        }).catch(() => {});
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  const handleEnterSelectMode = useCallback((messageId) => {
    setIsSelectMode(true);
    setSelectedMessages(new Set([messageId]));
  }, []);

  const handleSelectMessage = useCallback((messageId) => {
    setSelectedMessages((prev) => {
      const next = new Set(prev);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      if (next.size === 0) {
        setIsSelectMode(false);
      }
      return next;
    });
  }, []);

  const exitSelectMode = useCallback(() => {
    setIsSelectMode(false);
    setSelectedMessages(new Set());
  }, []);

  const handleSelectAll = useCallback(() => {
    const visibleIds = messages
      .filter((m) => !m.deletedForEveryone)
      .map((m) => m._id);
    setSelectedMessages(new Set(visibleIds));
  }, [messages]);

  const handleBulkDeleteForMe = async () => {
    if (selectedMessages.size === 0) return;
    const ids = Array.from(selectedMessages);
    setBulkDeleting(true);
    try {
      await messageAPI.bulkDeleteForMe(ids);
      ids.forEach((id) => removeMessage(id));
      toast.success(
        `${ids.length} message${ids.length > 1 ? "s" : ""} deleted`,
      );
      exitSelectMode();
    } catch (err) {
      toast.error("Failed to delete messages");
    } finally {
      setBulkDeleting(false);
    }
  };

  const selectedOwnMessages = Array.from(selectedMessages).filter((id) => {
    const msg = messages.find((m) => m._id === id);
    if (!msg) return false;
    const senderId =
      typeof msg.sender === "object" ? msg.sender._id : msg.sender;
    return senderId === user._id;
  });

  const handleBulkDeleteForEveryone = async () => {
    if (selectedOwnMessages.length === 0) return;
    if (
      !window.confirm(
        `Delete ${selectedOwnMessages.length} message${
          selectedOwnMessages.length > 1 ? "s" : ""
        } for everyone?`,
      )
    )
      return;
    setBulkDeleting(true);
    try {
      await messageAPI.bulkDeleteForEveryone(selectedOwnMessages);
      toast.success(
        `${selectedOwnMessages.length} message${
          selectedOwnMessages.length > 1 ? "s" : ""
        } deleted for everyone`,
      );
      exitSelectMode();
    } catch (err) {
      toast.error("Failed to delete messages");
    } finally {
      setBulkDeleting(false);
    }
  };

  useEffect(() => {
    const setVH = () => {
      const vh = window.visualViewport
        ? window.visualViewport.height
        : window.innerHeight;
      document.documentElement.style.setProperty("--app-height", `${vh}px`);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "end",
        });
      }, 100);
    };

    setVH();

    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", setVH);
      window.visualViewport.addEventListener("scroll", setVH);
      return () => {
        window.visualViewport.removeEventListener("resize", setVH);
        window.visualViewport.removeEventListener("scroll", setVH);
      };
    } else {
      window.addEventListener("resize", setVH);
      return () => window.removeEventListener("resize", setVH);
    }
  }, []);

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

  useEffect(() => {
    exitSelectMode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat?._id]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    }
  }, [messages, isTyping]);

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

  useEffect(() => {
    if (!socket || !chat?._id) return;
    const handleMessageDeleted = (data) => {
      const incomingChatId =
        typeof data.chatId === "object" ? data.chatId.toString() : data.chatId;
      if (incomingChatId === chat._id) {
        removeMessage(data.messageId);
      }
    };
    socket.on("message_deleted", handleMessageDeleted);
    return () => socket.off("message_deleted", handleMessageDeleted);
  }, [socket, chat?._id, removeMessage]);

  const handleSend = async (content, replyToData = null) => {
    const tempId = `temp-${Date.now()}-${Math.random()}`;
    const optimisticMessage = {
      _id: tempId,
      chat: chat._id,
      sender: {
        _id: user._id,
        fullName: user.fullName,
        username: user.username,
        avatar: user.avatar,
      },
      content,
      status: "sending",
      createdAt: new Date().toISOString(),
      isOptimistic: true,
      replyTo: replyToData,
    };

    addMessage(optimisticMessage);
    setReplyTo(null);
    setSending(true);

    try {
      const res = await messageAPI.send({
        chatId: chat._id,
        content,
        replyTo: replyToData?._id || null,
      });
      const realMessage = res.data.data;
      setMessages((prev) => {
        const filtered = prev.filter(
          (m) => m._id !== tempId && m._id !== realMessage._id,
        );
        return [...filtered, realMessage];
      });
      updateLastMessage(chat._id, realMessage);
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m._id !== tempId));
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleSendMedia = async (file, replyToData = null) => {
    const tempId = `temp-${Date.now()}-${Math.random()}`;
    const isVideo = file.type.startsWith("video/");
    const tempUrl = URL.createObjectURL(file);

    const optimisticMessage = {
      _id: tempId,
      chat: chat._id,
      sender: {
        _id: user._id,
        fullName: user.fullName,
        username: user.username,
        avatar: user.avatar,
      },
      content: "",
      messageType: isVideo ? "video" : "image",
      media: { url: tempUrl, type: isVideo ? "video" : "image" },
      status: "sending",
      createdAt: new Date().toISOString(),
      isOptimistic: true,
      uploadProgress: 0,
      replyTo: replyToData,
    };

    addMessage(optimisticMessage);
    setReplyTo(null);

    (async () => {
      const loadingToast = toast.loading(
        `Uploading ${isVideo ? "video" : "photo"}...`,
        { duration: Infinity },
      );

      try {
        const formData = new FormData();
        formData.append("media", file);
        formData.append("chatId", chat._id);
        if (replyToData?._id) formData.append("replyTo", replyToData._id);

        const res = await messageAPI.sendMedia(formData, (progress) => {
          setMessages((prev) =>
            prev.map((m) =>
              m._id === tempId ? { ...m, uploadProgress: progress } : m,
            ),
          );
          toast.loading(`Uploading... ${progress}%`, { id: loadingToast });
        });

        const realMessage = res.data.data;
        setMessages((prev) => {
          const filtered = prev.filter(
            (m) => m._id !== tempId && m._id !== realMessage._id,
          );
          return [...filtered, realMessage];
        });
        updateLastMessage(chat._id, realMessage);
        URL.revokeObjectURL(tempUrl);
        toast.success(
          `${isVideo ? "Video" : "Photo"} sent! ⏱️ Auto-deletes in 2 min`,
          { id: loadingToast, duration: 3000 },
        );
      } catch (err) {
        setMessages((prev) => prev.filter((m) => m._id !== tempId));
        URL.revokeObjectURL(tempUrl);
        toast.error(err.response?.data?.message || "Failed to send media", {
          id: loadingToast,
        });
      }
    })();
  };

  const handleEdit = async (messageId, newContent) => {
    try {
      await messageAPI.edit(messageId, newContent);
      toast.success("Message edited");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to edit");
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

  const handleReply = (message) => setReplyTo(message);
  const handleCancelReply = () => setReplyTo(null);

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

  const visibleMessages = messages.filter((m) => !m.deletedForEveryone);
  const messageGroups = groupMessagesByDate(visibleMessages);

  return (
    <div
      ref={containerRef}
      className="flex flex-col w-full overflow-hidden"
      style={{
        backgroundColor: "var(--color-bg)",
        height: "var(--app-height, 100dvh)",
        maxHeight: "var(--app-height, 100dvh)",
      }}
    >
      <div className="flex-shrink-0 z-30">
        <AnimatePresence mode="wait">
          {isSelectMode ? (
            <motion.div
              key="select-bar"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="flex items-center justify-between px-4 py-3 border-b"
              style={{
                backgroundColor: "var(--color-bgCard)",
                borderColor: "var(--color-border)",
              }}
            >
              <div className="flex items-center gap-3">
                <button
                  onClick={exitSelectMode}
                  className="p-1.5 rounded-lg transition-colors hover:bg-black/20"
                  style={{ color: "var(--color-textMuted)" }}
                >
                  <HiOutlineX className="text-xl" />
                </button>
                <span
                  className="text-sm font-semibold"
                  style={{ color: "var(--color-text)" }}
                >
                  {selectedMessages.size} selected
                </span>
              </div>

              <button
                onClick={handleSelectAll}
                className="text-xs px-3 py-1.5 rounded-lg transition-colors hover:bg-black/20"
                style={{ color: "var(--color-primary)" }}
              >
                Select all
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="normal-header"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
            >
              {/* 🔥 Use cleanup-wrapped back handler */}
              <ChatHeader
                chat={chat}
                isOnline={isOnline}
                isTyping={isTyping}
                onBack={handleBackWithCleanup}
                onChatCleared={() => setMessages([])}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin p-3 sm:p-4 space-y-2 relative min-h-0"
        style={{
          backgroundColor: "var(--color-bg)",
          overscrollBehavior: "contain",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              radial-gradient(circle at 20% 30%, var(--color-primary) 0%, transparent 8%),
              radial-gradient(circle at 80% 70%, var(--color-secondary) 0%, transparent 8%),
              radial-gradient(circle at 50% 50%, var(--color-primary) 0%, transparent 10%)
            `,
            opacity: 0.05,
          }}
        />

        <div className="relative z-0">
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
                          onReply={handleReply}
                          onEdit={handleEdit}
                          isSelectMode={isSelectMode}
                          isSelected={selectedMessages.has(message._id)}
                          onSelect={handleSelectMessage}
                          onEnterSelectMode={handleEnterSelectMode}
                        />
                      );
                    })}
                  </AnimatePresence>
                </div>
              ))}

              <AnimatePresence>
                {isTyping && !isSelectMode && (
                  <TypingIndicator name={otherUser.fullName.split(" ")[0]} />
                )}
              </AnimatePresence>
            </>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="flex-shrink-0 z-30">
        <AnimatePresence mode="wait">
          {isSelectMode ? (
            <motion.div
              key="bulk-actions"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.2 }}
              className="border-t p-3"
              style={{
                backgroundColor: "var(--color-bgCard)",
                borderColor: "var(--color-border)",
              }}
            >
              {selectedMessages.size === 0 ? (
                <p
                  className="text-center text-sm py-1"
                  style={{ color: "var(--color-textMuted)" }}
                >
                  Tap messages to select
                </p>
              ) : (
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleBulkDeleteForMe}
                    disabled={bulkDeleting}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                    style={{
                      backgroundColor: "var(--color-bgInput)",
                      border: "1px solid var(--color-border)",
                      color: "var(--color-text)",
                    }}
                  >
                    {bulkDeleting ? (
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <HiOutlineTrash className="text-base" />
                    )}
                    Delete for me
                  </button>

                  {selectedOwnMessages.length > 0 && (
                    <button
                      onClick={handleBulkDeleteForEveryone}
                      disabled={bulkDeleting}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 text-red-400 hover:bg-red-500/10"
                      style={{
                        border: "1px solid rgba(239, 68, 68, 0.3)",
                      }}
                    >
                      {bulkDeleting ? (
                        <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <HiOutlineTrash className="text-base" />
                      )}
                      Delete for all
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="normal-input"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.2 }}
            >
              {iBlockedThem && (
                <div
                  className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm border-t"
                  style={{
                    backgroundColor: "rgba(239, 68, 68, 0.08)",
                    borderColor: "var(--color-border)",
                    color: "#f87171",
                  }}
                >
                  <span>🚫</span>
                  <span>
                    You blocked{" "}
                    <strong>{otherUser.fullName.split(" ")[0]}</strong>.
                    Messages are disabled.
                  </span>
                </div>
              )}

              {theyBlockedMe && (
                <div
                  className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm border-t"
                  style={{
                    backgroundColor: "rgba(107, 114, 128, 0.08)",
                    borderColor: "var(--color-border)",
                    color: "var(--color-textMuted)",
                  }}
                >
                  <span>🔒</span>
                  <span>You can't send messages to this user.</span>
                </div>
              )}

              <ChatInput
                onSend={handleSend}
                onSendMedia={handleSendMedia}
                onTypingStart={handleTypingStart}
                onTypingStop={handleTypingStop}
                disabled={isBlocked}
                replyTo={replyTo}
                onCancelReply={handleCancelReply}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ChatWindow;
