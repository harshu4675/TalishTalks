import Avatar from "../../components/common/Avatar";
import React, { useState } from "react";
import { HiOutlineArrowLeft, HiOutlineDotsVertical, HiOutlineTrash, HiOutlineClock, HiOutlineBan, HiOutlineLockOpen, HiOutlineCheck } from "react-icons/hi";
import toast from "react-hot-toast";
import { chatAPI, userAPI } from "../../services/api";
import { useChat } from "../../hooks/useChat";
import { useFriends } from "../../hooks/useFriends";
import { errorMessage } from "../../utils/messages";
import ConfirmDialog from "../common/ConfirmDialog";
import PinModal from "./PinModal";

const ChatHeader = ({ chat, isOnline, isTyping, onBack }) => {
  const [menu, setMenu] = useState(false);
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(false);
  const { updateChatFlags, fetchChats, loadMessages } = useChat();
  const { removeFriendById } = useFriends();
  const other = chat.otherUser;
  const blocked = chat.iBlockedThem || chat.theyBlockedMe;
  const mode = chat.disappearingMessages?.mode || "off";
  const action = async (callback) => {
    if (busy) return;
    setBusy(true);
    try { await callback(); setDialog(null); setMenu(false); }
    catch (error) { toast.error(errorMessage(error)); }
    finally { setBusy(false); }
  };
  const changeMode = (value) => action(async () => {
    const response = await chatAPI.setDisappearing(chat._id, { mode: value });
    updateChatFlags(chat._id, { disappearingMessages: response.data.disappearingMessages });
    toast.success(response.data.message);
  });
  const toggleBlock = () => action(async () => {
    await userAPI[chat.iBlockedThem ? "unblock" : "block"](other._id);
    if (!chat.iBlockedThem) removeFriendById(other._id);
    await fetchChats();
    toast.success(chat.iBlockedThem ? "Contact unblocked" : "Contact blocked");
  });
  return <>
    <header className="conversation-header">
      <button className="icon-button mobile-back" onClick={onBack} aria-label="Back to chats"><HiOutlineArrowLeft /></button>
      <div className="avatar-presence"><Avatar src={other.avatar} alt="" />{isOnline && !blocked && <i />}</div>
      <div className="min-w-0 flex-1"><h2 className="truncate">{other.fullName}</h2><p className={isTyping ? "brand-text" : "muted"}>{blocked ? "Messaging unavailable" : isTyping ? "Typing…" : isOnline ? "Active now" : other.lastSeen ? `Last seen ${new Date(other.lastSeen).toLocaleDateString([], { month: "short", day: "numeric" })}` : "Offline"}</p></div>
      {mode !== "off" && <span className="header-mode" title="Disappearing messages enabled"><HiOutlineClock /></span>}
      <div className="relative"><button className="icon-button" onClick={() => setMenu(!menu)} aria-label="Conversation options" aria-expanded={menu}><HiOutlineDotsVertical /></button>
        {menu && <><button className="menu-dismiss" aria-label="Close conversation menu" onClick={() => setMenu(false)} /><div className="dropdown conversation-menu" role="menu">
          <div className="menu-label">Disappear after leaving</div>
          {[["off", "Off"], ["on_seen", "Immediately after reading"], ["after_2min", "Two minutes after reading"]].map(([value, label]) => <button key={value} role="menuitem" onClick={() => changeMode(value)} disabled={busy}><HiOutlineClock />{label}{mode === value && <HiOutlineCheck className="ml-auto" />}</button>)}
          <div className="menu-separator" />
          <button role="menuitem" onClick={() => { setMenu(false); setDialog("clear"); }}><HiOutlineTrash /> Clear my history</button>
          {chat.isLocked && <button role="menuitem" onClick={() => { setMenu(false); setDialog("unlock"); }}><HiOutlineLockOpen /> Remove chat lock</button>}
          {!chat.theyBlockedMe && <button role="menuitem" className={!chat.iBlockedThem ? "danger-text" : ""} onClick={() => chat.iBlockedThem ? toggleBlock() : setDialog("block")}><HiOutlineBan />{chat.iBlockedThem ? "Unblock contact" : "Block contact"}</button>}
        </div></>}
      </div>
    </header>
    <ConfirmDialog open={dialog === "clear"} onClose={() => setDialog(null)} busy={busy} danger title="Clear your chat history?" description="Existing messages will be hidden only for you. The other person keeps their history. New messages will still appear." confirmLabel="Clear for me" onConfirm={() => action(async () => { await chatAPI.clearChat(chat._id); await loadMessages(chat._id); toast.success("History cleared for you"); })} />
    <ConfirmDialog open={dialog === "block"} onClose={() => setDialog(null)} busy={busy} danger title={`Block ${other.fullName}?`} description="This contact will be removed from your friends and won’t be able to send you messages. You can unblock them later." confirmLabel="Block contact" onConfirm={toggleBlock} />
    <PinModal isOpen={dialog === "unlock"} mode="remove" title="Remove chat lock" subtitle="Enter your existing chat lock PIN." onClose={() => setDialog(null)} onSubmit={(pin) => action(async () => { await chatAPI.removeLock(chat._id, pin); updateChatFlags(chat._id, { isLocked: false }); toast.success("Chat lock removed"); })} />
  </>;
};
export default ChatHeader;
