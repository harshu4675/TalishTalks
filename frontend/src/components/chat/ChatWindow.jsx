import Avatar from "../../components/common/Avatar";
import React, { useEffect, useLayoutEffect, useRef, useState, useMemo, useCallback } from "react";
import { HiOutlineTrash, HiOutlineX, HiOutlineChatAlt2, HiOutlineArrowDown, HiOutlineChevronUp, HiOutlineBan } from "react-icons/hi";
import ChatHeader from "./ChatHeader";
import ChatInput from "./ChatInput";
import ChatBubble from "./ChatBubble";
import TypingIndicator from "./TypingIndicator";
import ConfirmDialog from "../common/ConfirmDialog";
import { useAuth } from "../../hooks/useAuth";
import { useSocket } from "../../hooks/useSocket";
import { useChat } from "../../hooks/useChat";
import { senderId } from "../../utils/messages";

const ChatWindow = ({ chat, onBack }) => {
  const { user } = useAuth();
  const { isUserOnline, emitTypingStart, emitTypingStop } = useSocket();
  const { messages, loadingMessages, loadingOlder, hasMore, historyError, typingUsers, loadMessages, sendMessage, sendMedia, editMessage, deleteMessages, markSeen, setReadingLatest } = useChat();
  const containerRef = useRef(null);
  const scrollSnapshot = useRef(null);
  const stickToBottom = useRef(true);
  const previousRef = useRef({ chatId: null, lastId: null, count: 0 });
  const [showJump, setShowJump] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmation, setConfirmation] = useState(null);
  const otherUser = chat.otherUser;
  const blocked = chat.iBlockedThem || chat.theyBlockedMe;
  const isTyping = typingUsers[chat._id] === otherUser._id;
  const selectedOwn = messages.filter((message) => selected.has(message._id) && senderId(message) === user._id && !message.isOptimistic);
  const lastSeen = [...messages].reverse().find((message) => senderId(message) === user._id && message.status === "seen")?._id;
  const visible = useMemo(() => messages.filter((message) => !message.deletedForEveryone), [messages]);
  const exitSelection = useCallback(() => { setSelectMode(false); setSelected(new Set()); }, []);

  useEffect(() => {
    exitSelection(); setReplyTo(null); stickToBottom.current = true; setReadingLatest(true);
    previousRef.current = { chatId: chat._id, lastId: null, count: 0 };
  }, [chat._id, exitSelection, setReadingLatest]);
  useEffect(() => { if (replyTo && !messages.some((message) => message._id === replyTo._id)) setReplyTo(null); }, [messages, replyTo]);
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const previous = previousRef.current;
    const last = messages.at(-1);
    if (scrollSnapshot.current?.chatId === chat._id) {
      const snapshot = scrollSnapshot.current;
      container.scrollTop += container.scrollHeight - snapshot.height;
      scrollSnapshot.current = null;
    } else if (previous.chatId !== chat._id || (last?._id !== previous.lastId && (stickToBottom.current || senderId(last) === user._id))) {
      container.scrollTop = container.scrollHeight;
      stickToBottom.current = true; setReadingLatest(true); setShowJump(false);
    } else if (messages.length < previous.count && stickToBottom.current) container.scrollTop = container.scrollHeight;
    previousRef.current = { chatId: chat._id, lastId: last?._id, count: messages.length };
  }, [messages, chat._id, user._id, loadingMessages, setReadingLatest]);
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => { if (stickToBottom.current) container.scrollTop = container.scrollHeight; });
    observer.observe(container);
    return () => observer.disconnect();
  }, [chat._id]);
  const onScroll = () => {
    const container = containerRef.current;
    const nearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    stickToBottom.current = nearBottom; setReadingLatest(nearBottom); setShowJump(!nearBottom);
    if (nearBottom) void markSeen(chat._id);
  };
  const loadOlder = async () => {
    const container = containerRef.current;
    scrollSnapshot.current = { chatId: chat._id, height: container.scrollHeight };
    stickToBottom.current = false;
    const loaded = await loadMessages(chat._id, true);
    if (!loaded) scrollSnapshot.current = null;
  };
  const jumpToBottom = () => { containerRef.current?.scrollTo({ top: containerRef.current.scrollHeight, behavior: "smooth" }); void markSeen(chat._id); };
  const toggleSelected = (id) => setSelected((previous) => { const next = new Set(previous); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const requestDelete = (ids, everyone) => setConfirmation({ ids, everyone });
  const confirmDelete = async () => {
    if (!confirmation || deleting) return;
    setDeleting(true);
    const success = await deleteMessages(confirmation.ids, confirmation.everyone);
    setDeleting(false);
    if (success) { setConfirmation(null); exitSelection(); }
  };
  const groups = useMemo(() => {
    const result = [];
    for (const message of visible) {
      const date = new Date(message.createdAt).toDateString();
      if (result.at(-1)?.date !== date) result.push({ date, messages: [] });
      result.at(-1).messages.push(message);
    }
    return result;
  }, [visible]);

  return <section className="conversation" aria-label={`Conversation with ${otherUser.fullName}`}>
    {selectMode ? <header className="selection-header">
      <button className="icon-button" onClick={exitSelection} aria-label="Cancel selection"><HiOutlineX /></button>
      <strong>{selected.size} selected</strong>
      <button className="text-button ml-auto" onClick={() => setSelected(new Set(visible.filter((message) => !message.isOptimistic).map((message) => message._id)))}>Select all</button>
    </header> : <ChatHeader chat={chat} isOnline={isUserOnline(otherUser._id)} isTyping={isTyping} onBack={onBack} />}
    <div ref={containerRef} className="message-scroll" onScroll={onScroll}>
      {hasMore && <button className="load-older" disabled={loadingOlder} onClick={loadOlder}><HiOutlineChevronUp /> {loadingOlder ? "Loading earlier messages…" : "Load earlier messages"}</button>}
      {loadingMessages ? <div className="message-loading" role="status"><span className="spinner" /> Loading messages…</div> : historyError ? <div className="empty-state compact"><h3>Couldn’t load this conversation</h3><p>{historyError}</p><button className="button secondary" onClick={() => loadMessages(chat._id)}>Try again</button></div> : !visible.length ? <div className="empty-state conversation-empty"><Avatar src={otherUser.avatar} alt="" /><h3>{otherUser.fullName}</h3><p>@{otherUser.username}</p><span className="muted text-sm">Start a conversation with a message.</span><HiOutlineChatAlt2 className="empty-chat-icon" /></div> : groups.map((group) => <div key={group.date} className="message-day">
        <div className="date-divider">{group.date === new Date().toDateString() ? "Today" : new Date(group.date).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}</div>
        {group.messages.map((message) => <ChatBubble key={message._id} message={message} isOwn={senderId(message) === user._id} isLastSeen={message._id === lastSeen}
          onDeleteForMe={(id) => requestDelete([id], false)} onDeleteForEveryone={(id) => requestDelete([id], true)}
          onReply={setReplyTo} onEdit={editMessage} isSelectMode={selectMode} isSelected={selected.has(message._id)} onSelect={toggleSelected}
          onEnterSelectMode={(id) => { setSelectMode(true); setSelected(new Set([id])); }} />)}
      </div>)}
      {isTyping && !selectMode && <div className="typing-area"><TypingIndicator name={otherUser.fullName.split(" ")[0]} /></div>}
    </div>
    {showJump && <button className="jump-bottom" onClick={jumpToBottom} aria-label="Jump to latest messages"><HiOutlineArrowDown /></button>}
    {selectMode ? <footer className="selection-actions">
      <button className="button secondary" disabled={!selected.size || deleting} onClick={() => requestDelete([...selected], false)}><HiOutlineTrash /> Delete for me</button>
      <button className="button danger" disabled={!selectedOwn.length || deleting || selectedOwn.length !== selected.size} title={selectedOwn.length !== selected.size ? "You can only delete your own messages for everyone" : undefined} onClick={() => requestDelete(selectedOwn.map((message) => message._id), true)}><HiOutlineTrash /> Delete for everyone</button>
    </footer> : <>
      {blocked && <div className="block-notice"><HiOutlineBan />{chat.iBlockedThem ? "You blocked this contact. Unblock them to send messages." : "You can’t send messages to this contact."}</div>}
      <ChatInput key={chat._id} onSend={(content, reply) => sendMessage(chat._id, content, reply)} onSendMedia={(file, reply, onProgress) => sendMedia(chat._id, file, reply, onProgress)} onTypingStart={() => emitTypingStart(chat._id)} onTypingStop={() => emitTypingStop(chat._id)} disabled={blocked} replyTo={replyTo} onCancelReply={() => setReplyTo(null)} />
    </>}
    <ConfirmDialog open={!!confirmation} onClose={() => setConfirmation(null)} busy={deleting} onConfirm={confirmDelete} danger title={confirmation?.everyone ? "Delete for everyone?" : "Delete for you?"}
      description={confirmation?.everyone ? `Permanently delete ${confirmation.ids.length} message(s) for both people? This cannot be undone.` : `Remove ${confirmation?.ids.length || 0} message(s) from your history? The other person will still see them.`}
      confirmLabel={confirmation?.everyone ? "Delete for everyone" : "Delete for me"} />
  </section>;
};
export default ChatWindow;
