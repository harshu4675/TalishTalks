import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  HiOutlineTrash,
  HiOutlineX,
  HiOutlineCheck,
  HiOutlineLockClosed,
  HiOutlineLockOpen,
  HiOutlineArrowLeft,
  HiOutlineBan,
} from "react-icons/hi";
import { TbPin } from "react-icons/tb";
import { HiOutlineBellSlash } from "react-icons/hi2";
import { useSocket } from "../../hooks/useSocket";
import { useAuth } from "../../hooks/useAuth";
import { useChat } from "../../hooks/useChat";
import { useFriends } from "../../hooks/useFriends";
import { chatAPI, userAPI, friendAPI } from "../../services/api";
import ChatActionSheet from "./ChatActionSheet";
import PinModal from "./PinModal";

const LONG_PRESS_DURATION = 500;

const ChatList = ({ chats, loading, activeChatId, onChatSelect }) => {
  const { isUserOnline } = useSocket();
  const { user } = useAuth();
  const { removeFriendById } = useFriends(); // 🔥 NEW
  const {
    updateChatFlags,
    removeChatFromList,
    fetchChats,
    unlockedChats,
    showLockedSection,
    setShowLockedSection,
    markChatsUnlocked,
    lockAllAgain,
  } = useChat();

  const [actionSheetChat, setActionSheetChat] = useState(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const [pinModal, setPinModal] = useState({
    open: false,
    mode: "verify",
    chat: null,
    onSubmit: null,
    title: "",
    subtitle: "",
  });

  const pressTimerRef = useRef(null);
  const longPressedRef = useRef(false);

  const formatTime = (date) => {
    if (!date) return "";
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "now";
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return d.toLocaleDateString();
  };

  const truncate = (text, len = 30) => {
    if (!text) return "";
    return text.length > len ? text.slice(0, len) + "..." : text;
  };

  const visibleChats = showLockedSection
    ? chats.filter((c) => c.isLocked)
    : chats.filter((c) => !c.isLocked);

  const lockedCount = chats.filter((c) => c.isLocked).length;

  const handlePressStart = (e, chat) => {
    longPressedRef.current = false;
    pressTimerRef.current = setTimeout(() => {
      longPressedRef.current = true;
      if (navigator.vibrate) navigator.vibrate(40);
      setActionSheetChat(chat);
    }, LONG_PRESS_DURATION);
  };

  const handlePressEnd = () => {
    if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
  };

  const handlePressCancel = () => {
    if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
  };

  const handleContextMenu = (e, chat) => {
    e.preventDefault();
    setActionSheetChat(chat);
  };

  const handleChatClick = (chat) => {
    if (longPressedRef.current) {
      longPressedRef.current = false;
      return;
    }
    if (selectMode) {
      toggleSelect(chat._id);
      return;
    }
    onChatSelect(chat);
  };

  const toggleSelect = (chatId) => {
    setSelectedIds((prev) => {
      const updated = new Set(prev);
      if (updated.has(chatId)) updated.delete(chatId);
      else updated.add(chatId);
      if (updated.size === 0) setSelectMode(false);
      return updated;
    });
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const handleBulkDelete = async () => {
    if (
      !window.confirm(
        `Delete ${selectedIds.size} chat(s)? Messages will be removed from your view.`,
      )
    )
      return;

    const ids = Array.from(selectedIds);
    let success = 0;
    for (const id of ids) {
      try {
        await chatAPI.deleteChat(id);
        removeChatFromList(id);
        success++;
      } catch (err) {
        console.error("Delete failed:", err);
      }
    }
    toast.success(`Deleted ${success} chat(s)`);
    exitSelectMode();
  };

  const openLockedSection = async () => {
    if (lockedCount === 0) {
      toast("No locked chats yet. Lock one from the chat menu!", {
        icon: "🔒",
      });
      return;
    }

    setPinModal({
      open: true,
      mode: "verify",
      title: "View Locked Chats",
      subtitle: "Enter your PIN to access locked chats",
      onSubmit: async (pin) => {
        const firstLocked = chats.find((c) => c.isLocked);
        if (!firstLocked) throw new Error("No locked chats");
        await chatAPI.unlock(firstLocked._id, pin);
        markChatsUnlocked();
        setShowLockedSection(true);
        setPinModal((p) => ({ ...p, open: false }));
      },
    });
  };

  const closeLockedSection = () => {
    lockAllAgain();
  };

  const handleProtectedChatClick = (chat) => {
    if (chat.isLocked && !unlockedChats.has(chat._id)) {
      setPinModal({
        open: true,
        mode: "verify",
        title: "Unlock Chat",
        subtitle: "Enter your PIN to view this chat",
        onSubmit: async (pin) => {
          await chatAPI.unlock(chat._id, pin);
          markChatsUnlocked();
          setPinModal((p) => ({ ...p, open: false }));
          handleChatClick(chat);
        },
      });
      return;
    }
    handleChatClick(chat);
  };

  const handleAction = async (actionId) => {
    const chat = actionSheetChat;
    if (!chat) return;

    try {
      switch (actionId) {
        case "pin": {
          const res = await chatAPI.togglePin(chat._id);
          updateChatFlags(chat._id, { isPinned: res.data.isPinned });
          toast.success(res.data.message);
          break;
        }
        case "mute": {
          const res = await chatAPI.toggleMute(chat._id);
          updateChatFlags(chat._id, { isMuted: res.data.isMuted });
          toast.success(res.data.message);
          break;
        }
        case "markUnread": {
          const res = await chatAPI.toggleMarkUnread(chat._id);
          updateChatFlags(chat._id, {
            isMarkedUnread: res.data.isMarkedUnread,
          });
          toast.success(res.data.message);
          break;
        }
        case "lock": {
          if (chat.isLocked) {
            setPinModal({
              open: true,
              mode: "remove",
              chat,
              title: "Remove Chat Lock",
              subtitle: "Enter your PIN to remove the lock",
              onSubmit: async (pin) => {
                await chatAPI.removeLock(chat._id, pin);
                updateChatFlags(chat._id, { isLocked: false });
                toast.success("Lock removed");
                setPinModal((p) => ({ ...p, open: false }));
              },
            });
          } else {
            setPinModal({
              open: true,
              mode: "set",
              chat,
              title: "Lock This Chat",
              subtitle:
                "Enter a 4-digit PIN. Use the same PIN if you already locked another chat.",
              onSubmit: async (pin) => {
                await chatAPI.lock(chat._id, pin);
                updateChatFlags(chat._id, { isLocked: true });
                toast.success("Chat locked 🔒");
                setPinModal((p) => ({ ...p, open: false }));
              },
            });
          }
          break;
        }
        case "select": {
          setSelectMode(true);
          setSelectedIds(new Set([chat._id]));
          break;
        }
        case "block": {
          const otherUserId = chat.otherUser?._id;
          if (!otherUserId) return;

          if (chat.iBlockedThem) {
            await userAPI.unblock(otherUserId);
            updateChatFlags(chat._id, { iBlockedThem: false });
            toast.success("User unblocked");
          } else {
            if (
              !window.confirm(
                `Block ${chat.otherUser.fullName}? They won't be able to message you, and they'll be removed from your friends.`,
              )
            )
              return;
            await userAPI.block(otherUserId);
            updateChatFlags(chat._id, { iBlockedThem: true });
            // 🔥 Remove from friends list instantly
            removeFriendById(otherUserId);
            toast.success(`${chat.otherUser.fullName} blocked 🚫`);
            fetchChats();
          }
          break;
        }
        case "removeFriend": {
          const otherUserId = chat.otherUser?._id;
          if (!otherUserId) return;
          if (
            !window.confirm(`Remove ${chat.otherUser.fullName} from friends?`)
          )
            return;
          await friendAPI.removeFriend(otherUserId);
          // 🔥 Remove from friends list instantly
          removeFriendById(otherUserId);
          toast.success("Friend removed");
          fetchChats();
          break;
        }
        case "delete": {
          if (
            !window.confirm(
              "Delete this chat? Messages will be hidden from your view (the other person still sees them).",
            )
          )
            return;
          await chatAPI.deleteChat(chat._id);
          removeChatFromList(chat._id);
          toast.success("Chat deleted");
          break;
        }
        default:
          break;
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Action failed");
    }
  };

  if (loading) {
    return (
      <div className="space-y-1 p-2">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-3 rounded-xl animate-pulse"
          >
            <div className="w-12 h-12 rounded-full skeleton" />
            <div className="flex-1 space-y-2">
              <div className="h-4 skeleton rounded w-3/4" />
              <div className="h-3 skeleton rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      {/* Multi-select header */}
      <AnimatePresence>
        {selectMode && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="sticky top-0 z-20 px-3 py-2 flex items-center justify-between"
            style={{
              backgroundColor: "var(--color-bgCard)",
              borderBottom: "1px solid var(--color-border)",
            }}
          >
            <div className="flex items-center gap-2">
              <button
                onClick={exitSelectMode}
                className="p-1.5 rounded-lg hover:bg-black/20"
                style={{ color: "var(--color-textMuted)" }}
              >
                <HiOutlineX className="text-lg" />
              </button>
              <span
                className="text-sm font-semibold"
                style={{ color: "var(--color-text)" }}
              >
                {selectedIds.size} selected
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleBulkDelete}
                disabled={selectedIds.size === 0}
                className="p-2 rounded-lg hover:bg-red-500/10 disabled:opacity-50"
                style={{ color: "#ef4444" }}
                title="Delete selected"
              >
                <HiOutlineTrash className="text-lg" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Locked-section header */}
      {showLockedSection && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky top-0 z-20 px-3 py-3 flex items-center gap-2"
          style={{
            backgroundColor: "var(--color-bgCard)",
            borderBottom: "1px solid var(--color-border)",
          }}
        >
          <button
            onClick={closeLockedSection}
            className="p-1.5 rounded-lg hover:bg-black/20"
            style={{ color: "var(--color-textMuted)" }}
          >
            <HiOutlineArrowLeft className="text-lg" />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <HiOutlineLockOpen
              className="text-base"
              style={{ color: "var(--color-primary)" }}
            />
            <span
              className="text-sm font-semibold"
              style={{ color: "var(--color-text)" }}
            >
              Locked Chats ({lockedCount})
            </span>
          </div>
        </motion.div>
      )}

      {/* Locked chats entry button */}
      {!showLockedSection && !selectMode && lockedCount > 0 && (
        <button
          onClick={openLockedSection}
          className="w-full mx-2 my-2 p-3 rounded-xl flex items-center gap-3 transition-colors hover:bg-black/10"
          style={{
            backgroundColor: "var(--color-bgInput)",
            border: "1px solid var(--color-border)",
            width: "calc(100% - 1rem)",
          }}
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            style={{
              background:
                "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primaryDark) 100%)",
            }}
          >
            <HiOutlineLockClosed className="text-white text-lg" />
          </div>
          <div className="flex-1 text-left min-w-0">
            <p
              className="text-sm font-semibold"
              style={{ color: "var(--color-text)" }}
            >
              Locked Chats
            </p>
            <p className="text-xs" style={{ color: "var(--color-textMuted)" }}>
              {lockedCount} locked chat{lockedCount > 1 ? "s" : ""} · Tap to
              view
            </p>
          </div>
        </button>
      )}

      {/* Empty states */}
      {showLockedSection && lockedCount === 0 && (
        <div className="text-center py-12 px-4">
          <div className="text-5xl mb-3">🔓</div>
          <p
            className="text-sm font-medium"
            style={{ color: "var(--color-text)" }}
          >
            No locked chats
          </p>
        </div>
      )}

      {!showLockedSection && visibleChats.length === 0 && lockedCount === 0 && (
        <div className="text-center py-12 px-4">
          <div className="text-5xl mb-3 animate-float">💭</div>
          <p className="text-sm font-medium text-offwhite mb-1">No chats yet</p>
          <p className="text-xs text-gray-soft">
            Select a friend to start chatting
          </p>
        </div>
      )}

      <div className="px-2 py-1 space-y-0.5">
        <AnimatePresence>
          {visibleChats.map((chat, index) => {
            const otherUser = chat.otherUser;
            if (!otherUser) return null;

            const isOnline = isUserOnline(otherUser._id);
            const isActive = activeChatId === chat._id && !selectMode;
            const isSelected = selectedIds.has(chat._id);
            const lastMsg = chat.lastMessage;
            const isOwnLast =
              lastMsg &&
              (typeof lastMsg.sender === "object"
                ? lastMsg.sender._id === user._id
                : lastMsg.sender === user._id);

            const showUnreadBadge =
              (chat.unreadCount > 0 || chat.isMarkedUnread) && !isActive;

            // 🔥 Blocked state
            const isBlocked = chat.iBlockedThem || chat.theyBlockedMe;

            return (
              <motion.div
                key={chat._id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: index * 0.02 }}
                onClick={() => handleProtectedChatClick(chat)}
                onContextMenu={(e) => handleContextMenu(e, chat)}
                onTouchStart={(e) => handlePressStart(e, chat)}
                onTouchEnd={handlePressEnd}
                onTouchMove={handlePressCancel}
                onTouchCancel={handlePressCancel}
                onMouseDown={(e) => {
                  if (e.button === 0) handlePressStart(e, chat);
                }}
                onMouseUp={handlePressEnd}
                onMouseLeave={handlePressCancel}
                className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 select-none ${
                  isActive
                    ? "bg-dark-100 border-l-2 border-accent"
                    : isSelected
                      ? "bg-dark-100/80"
                      : "hover:bg-dark-100/70"
                }`}
                style={{ WebkitTouchCallout: "none" }}
              >
                {selectMode ? (
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
                    style={{
                      backgroundColor: isSelected
                        ? "var(--color-primary)"
                        : "var(--color-bgInput)",
                      border: `2px solid ${
                        isSelected
                          ? "var(--color-primary)"
                          : "var(--color-border)"
                      }`,
                    }}
                  >
                    {isSelected ? (
                      <HiOutlineCheck className="text-white text-xl" />
                    ) : (
                      <img
                        src={otherUser.avatar}
                        alt={otherUser.fullName}
                        className="w-full h-full rounded-full object-cover"
                      />
                    )}
                  </div>
                ) : (
                  // 🔥 Avatar with indicators
                  <div className="relative flex-shrink-0">
                    <img
                      src={otherUser.avatar}
                      alt={otherUser.fullName}
                      className="w-12 h-12 rounded-full object-cover border border-dark-200"
                      style={{
                        opacity: isBlocked ? 0.6 : 1,
                        filter: isBlocked ? "grayscale(40%)" : "none",
                      }}
                    />

                    {/* 🔥 Online dot - hidden if blocked */}
                    {isOnline && !isBlocked && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-dark" />
                    )}

                    {/* 🔥 Blocked indicator - red ban icon */}
                    {isBlocked && (
                      <div
                        className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{
                          backgroundColor: "#ef4444",
                          border: "2px solid var(--color-bg)",
                        }}
                      >
                        <HiOutlineBan className="text-white text-[10px]" />
                      </div>
                    )}

                    {/* Lock indicator */}
                    {chat.isLocked && (
                      <div
                        className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{
                          backgroundColor: "var(--color-primary)",
                        }}
                      >
                        <HiOutlineLockClosed className="text-white text-[10px]" />
                      </div>
                    )}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5 gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <p
                        className="text-sm font-semibold truncate"
                        style={{
                          color: isBlocked
                            ? "var(--color-textMuted)"
                            : "var(--color-text)",
                        }}
                      >
                        {otherUser.fullName}
                      </p>
                      {chat.isMuted && (
                        <HiOutlineBellSlash
                          className="text-xs flex-shrink-0"
                          style={{ color: "var(--color-textMuted)" }}
                          title="Muted"
                        />
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {chat.isPinned && (
                        <TbPin
                          className="text-xs rotate-45"
                          style={{ color: "var(--color-primary)" }}
                          title="Pinned"
                        />
                      )}
                      <span
                        className="text-[10px]"
                        style={{ color: "var(--color-textMuted)" }}
                      >
                        {formatTime(lastMsg?.createdAt || chat.updatedAt)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className="text-xs truncate"
                      style={{ color: "var(--color-textMuted)" }}
                    >
                      {chat.iBlockedThem ? (
                        <span className="italic text-red-400 flex items-center gap-1">
                          <HiOutlineBan className="text-xs" />
                          You blocked this user
                        </span>
                      ) : chat.theyBlockedMe ? (
                        <span
                          className="italic"
                          style={{ color: "var(--color-textMuted)" }}
                        >
                          🔒 Messaging unavailable
                        </span>
                      ) : lastMsg && !lastMsg.deletedForEveryone ? (
                        <>
                          {isOwnLast && (
                            <span style={{ color: "var(--color-primary)" }}>
                              You:{" "}
                            </span>
                          )}
                          {lastMsg.messageType === "image"
                            ? "📷 Photo"
                            : lastMsg.messageType === "video"
                              ? "📹 Video"
                              : truncate(lastMsg.content)}
                        </>
                      ) : (
                        <span className="italic">No messages yet</span>
                      )}
                    </p>
                    {showUnreadBadge && !isBlocked && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="flex-shrink-0 bg-accent text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1.5"
                      >
                        {chat.unreadCount > 9 ? "9+" : chat.unreadCount || ""}
                      </motion.span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Action Sheet */}
      <ChatActionSheet
        isOpen={!!actionSheetChat}
        chat={actionSheetChat}
        onClose={() => setActionSheetChat(null)}
        onAction={handleAction}
      />

      {/* PIN Modal */}
      <PinModal
        isOpen={pinModal.open}
        mode={pinModal.mode}
        title={pinModal.title}
        subtitle={pinModal.subtitle}
        onSubmit={pinModal.onSubmit}
        onClose={() => setPinModal((p) => ({ ...p, open: false }))}
      />
    </>
  );
};

export default ChatList;
