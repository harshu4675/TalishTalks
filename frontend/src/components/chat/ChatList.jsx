import Avatar from "../../components/common/Avatar";
import React, { useState, useRef, useEffect } from "react";
import { HiOutlineChatAlt2, HiOutlineDotsVertical, HiOutlineCheck, HiOutlineLockClosed, HiOutlineBan } from "react-icons/hi";
import { TbPin } from "react-icons/tb";
import { HiOutlineBellSlash } from "react-icons/hi2";
import toast from "react-hot-toast";
import { useSocket } from "../../hooks/useSocket";
import { useAuth } from "../../hooks/useAuth";
import { useChat } from "../../hooks/useChat";
import { useFriends } from "../../hooks/useFriends";
import { chatAPI, userAPI, friendAPI } from "../../services/api";
import { senderId, errorMessage } from "../../utils/messages";
import ChatActionSheet from "./ChatActionSheet";
import PinModal from "./PinModal";
import FirstLockGuide from "./FirstLockGuide";
import ConfirmDialog from "../common/ConfirmDialog";

const ChatList = ({ chats, loading, activeChatId, onChatSelect }) => {
  const { isUserOnline } = useSocket();
  const { user } = useAuth();
  const { removeFriendById } = useFriends();
  const { updateChatFlags, removeChatFromList, fetchChats, unlockedChats, markChatsUnlocked } = useChat();
  const [actionChat, setActionChat] = useState(null);
  const [pinModal, setPinModal] = useState(null);
  const [guide, setGuide] = useState(false);
  const [selection, setSelection] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
  const [busy, setBusy] = useState(false);
  const timer = useRef(null), longPressed = useRef(false);
  useEffect(() => () => clearTimeout(timer.current), []);
  const open = (chat) => {
    if (longPressed.current) { longPressed.current = false; return; }
    if (selection) { setSelection((previous) => { const next = new Set(previous); next.has(chat._id) ? next.delete(chat._id) : next.add(chat._id); return next; }); return; }
    if (chat.isLocked && !unlockedChats.has(chat._id)) setPinModal({ mode: "verify", title: "Unlock chat", subtitle: "Enter your chat lock PIN.", onSubmit: async (pin) => { await chatAPI.unlock(chat._id, pin); markChatsUnlocked(); setPinModal(null); onChatSelect(chat); } });
    else onChatSelect(chat);
  };
  const handleAction = async (id) => {
    const chat = actionChat;
    if (!chat || busy) return;
    if (id === "select") { setSelection(new Set([chat._id])); return; }
    if (["delete", "block", "removeFriend"].includes(id)) { setConfirmation({ id, chat }); return; }
    if (id === "lock") {
      setPinModal(chat.isLocked ? { mode: "remove", title: "Remove chat lock", subtitle: "Enter your chat lock PIN.", onSubmit: async (pin) => { await chatAPI.removeLock(chat._id, pin); updateChatFlags(chat._id, { isLocked: false }); setPinModal(null); toast.success("Lock removed"); } } : {
        mode: "set", title: "Lock this chat", subtitle: "Use your existing PIN, or create one with 4–12 digits.", onSubmit: async (pin) => {
          await chatAPI.lock(chat._id, pin); updateChatFlags(chat._id, { isLocked: true }); setPinModal(null);
          if (!localStorage.getItem("talish_lock_guide_seen")) { setGuide(true); localStorage.setItem("talish_lock_guide_seen", "true"); }
          else toast.success("Chat locked");
        },
      }); return;
    }
    setBusy(true);
    try {
      const methods = { pin: ["togglePin", "isPinned"], mute: ["toggleMute", "isMuted"], markUnread: ["toggleMarkUnread", "isMarkedUnread"] };
      const [method, flag] = methods[id] || [];
      if (!method) return;
      const response = await chatAPI[method](chat._id);
      updateChatFlags(chat._id, { [flag]: response.data[flag] }); toast.success(response.data.message);
    } catch (error) { toast.error(errorMessage(error)); }
    finally { setBusy(false); }
  };
  const confirmAction = async () => {
    const { id, chat } = confirmation;
    setBusy(true);
    try {
      if (id === "delete") {
        const ids = selection ? [...selection] : [chat._id];
        const results = await Promise.allSettled(ids.map((chatId) => chatAPI.deleteChat(chatId)));
        results.forEach((result, index) => { if (result.status === "fulfilled") removeChatFromList(ids[index]); });
        const failed = results.filter((result) => result.status === "rejected").length;
        if (failed) toast.error(`${failed} chat(s) could not be deleted. Try again.`);
        else toast.success("Chat removed for you");
        setSelection(null);
      } else if (id === "block") {
        if (chat.iBlockedThem) await userAPI.unblock(chat.otherUser._id);
        else { await userAPI.block(chat.otherUser._id); removeFriendById(chat.otherUser._id); }
        await fetchChats(); toast.success(chat.iBlockedThem ? "Contact unblocked" : "Contact blocked");
      } else { await friendAPI.removeFriend(chat.otherUser._id); removeFriendById(chat.otherUser._id); await fetchChats(); toast.success("Friend removed"); }
      setConfirmation(null);
    } catch (error) { toast.error(errorMessage(error)); }
    finally { setBusy(false); }
  };
  if (loading) return <div className="chat-list-loading" role="status"><span className="spinner" /> Loading conversations…</div>;
  return <>
    {selection && <div className="chat-selection"><button className="text-button" onClick={() => setSelection(null)}>Cancel</button><span>{selection.size} selected</span><button className="text-button danger-text" disabled={!selection.size} onClick={() => setConfirmation({ id: "delete", chat: chats.find((chat) => selection.has(chat._id)) })}>Delete for me</button></div>}
    {!chats.length ? <div className="empty-state compact"><HiOutlineChatAlt2 /><h3>No conversations found</h3><p>Choose a friend to start chatting.</p></div> : <div className="chat-list">{chats.map((chat) => {
      const other = chat.otherUser, last = chat.lastMessage;
      const blocked = chat.iBlockedThem || chat.theyBlockedMe;
      const active = activeChatId === chat._id;
      return <div key={chat._id} className={`chat-list-item ${active || selection?.has(chat._id) ? "active" : ""}`}
        onContextMenu={(event) => { event.preventDefault(); setActionChat(chat); }}
        onTouchStart={() => { longPressed.current = false; timer.current = setTimeout(() => { longPressed.current = true; setActionChat(chat); }, 550); }}
        onTouchMove={() => clearTimeout(timer.current)} onTouchEnd={() => clearTimeout(timer.current)} onTouchCancel={() => clearTimeout(timer.current)}>
        <button className="chat-item-main" onClick={() => open(chat)} aria-label={`Open chat with ${other.fullName}`}>
          <div className="avatar-presence"><Avatar src={other.avatar} alt="" />{isUserOnline(other._id) && !blocked && <i />}{chat.isLocked && <span className="avatar-lock"><HiOutlineLockClosed /></span>}</div>
          <div className="min-w-0 flex-1"><div className="chat-item-top"><strong className="truncate">{other.fullName}</strong><time>{new Date(last?.createdAt || chat.updatedAt).toLocaleDateString([], { month: "short", day: "numeric" })}</time></div>
            <div className="chat-item-bottom"><span className={`truncate ${chat.unreadCount ? "unread-preview" : ""}`}>{blocked ? "Messaging unavailable" : last ? `${senderId(last) === user._id ? "You: " : ""}${last.messageType === "image" ? "Photo" : last.messageType === "video" ? "Video" : last.content}` : "No messages yet"}</span>
              {(chat.unreadCount > 0 || chat.isMarkedUnread) && !active && <span className="unread-count">{chat.unreadCount > 99 ? "99+" : chat.unreadCount || <HiOutlineCheck />}</span>}
            </div>
            {(chat.isPinned || chat.isMuted || blocked) && <div className="chat-item-flags">{chat.isPinned && <TbPin />}{chat.isMuted && <HiOutlineBellSlash />}{blocked && <HiOutlineBan />}</div>}
          </div>
        </button>
        <button className="chat-options icon-button small" onClick={() => setActionChat(chat)} aria-label={`Options for ${other.fullName}`}><HiOutlineDotsVertical /></button>
      </div>;
    })}</div>}
    <ChatActionSheet isOpen={!!actionChat} chat={actionChat} onClose={() => setActionChat(null)} onAction={handleAction} />
    <PinModal isOpen={!!pinModal} {...pinModal} onClose={() => setPinModal(null)} />
    <FirstLockGuide isOpen={guide} onClose={() => setGuide(false)} />
    <ConfirmDialog open={!!confirmation} onClose={() => setConfirmation(null)} busy={busy} danger title={confirmation?.id === "delete" ? "Delete chat for you?" : confirmation?.id === "block" ? (confirmation.chat.iBlockedThem ? "Unblock contact?" : "Block contact?") : "Remove friend?"}
      description={confirmation?.id === "delete" ? "These conversations will be removed from your list. The other person keeps their messages. A new message can bring the chat back." : confirmation?.id === "block" ? "Blocking removes this person from your friends and prevents new messages. Existing history is kept." : "This person will be removed from your friends. Existing chat history is kept."}
      confirmLabel={confirmation?.id === "delete" ? "Delete for me" : confirmation?.id === "block" ? (confirmation.chat.iBlockedThem ? "Unblock" : "Block") : "Remove friend"} onConfirm={confirmAction} />
  </>;
};
export default ChatList;
