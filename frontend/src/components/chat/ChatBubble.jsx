import React, { useState, useRef, useEffect } from "react";
import { HiOutlineDotsVertical, HiOutlineTrash, HiCheck, HiOutlineReply, HiOutlinePencil, HiOutlineClipboardCopy, HiOutlinePlay, HiOutlineClock, HiOutlineRefresh } from "react-icons/hi";
import toast from "react-hot-toast";
import MediaViewer from "./MediaViewer";
import EditMessageModal from "./EditMessageModal";
import { useChat } from "../../hooks/useChat";

const ChatBubble = ({ message, isOwn, isLastSeen, onDeleteForMe, onDeleteForEveryone, onReply, onEdit, isSelectMode, isSelected, onSelect, onEnterSelectMode }) => {
  const { retryMessage, retryMedia, discardMessage } = useChat();
  const [showMenu, setShowMenu] = useState(false);
  const [showMedia, setShowMedia] = useState(false);
  const [editing, setEditing] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const longPress = useRef(null);
  const suppressClick = useRef(false);
  const buttonRef = useRef(null);
  const hasMedia = ["image", "video"].includes(message.messageType);
  const persisted = !message.isOptimistic && !message.failed;
  useEffect(() => () => clearTimeout(longPress.current), []);
  useEffect(() => { if (isSelectMode || !persisted) setShowMenu(false); }, [isSelectMode, persisted]);
  useEffect(() => {
    if (!message.mediaAutoDeleteAt || message.isOptimistic) return;
    const update = () => setTimeLeft(Math.max(0, Math.ceil((new Date(message.mediaAutoDeleteAt).getTime() - Date.now()) / 1000)));
    update(); const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [message.mediaAutoDeleteAt, message.isOptimistic]);
  useEffect(() => {
    if (!showMenu) return;
    const close = (event) => { if (!event.target.closest?.("[data-message-menu]")) setShowMenu(false); };
    const escape = (event) => { if (event.key === "Escape") setShowMenu(false); };
    const scroll = () => setShowMenu(false);
    document.addEventListener("pointerdown", close); document.addEventListener("keydown", escape); window.addEventListener("scroll", scroll, { capture: true });
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", escape); window.removeEventListener("scroll", scroll, { capture: true }); };
  }, [showMenu]);
  if (message.deletedForEveryone) return null;
  const act = (callback) => { setShowMenu(false); callback?.(); };
  const copy = async () => {
    try { await navigator.clipboard.writeText(message.content); toast.success("Copied"); }
    catch { toast.error("Clipboard is unavailable in this browser."); }
    setShowMenu(false);
  };
  return <div className={`message-row ${isOwn ? "own" : "incoming"} ${isSelected ? "selected" : ""}`} data-message-id={message._id}>
    {isSelectMode && <input type="checkbox" checked={isSelected} onChange={() => onSelect(message._id)} aria-label="Select message" disabled={!persisted} />}
    <div className="message-content">
      <div className={`message-bubble ${hasMedia ? "has-media" : ""} ${message.failed ? "failed" : ""}`}
        onClick={() => { if (suppressClick.current) { suppressClick.current = false; return; } if (isSelectMode && persisted) onSelect(message._id); }}
        onDoubleClick={() => { if (persisted && !isSelectMode) onReply(message); }}
        onContextMenu={(event) => { if (persisted && !isSelectMode) { event.preventDefault(); setShowMenu(true); } }}
        onTouchStart={() => { if (persisted) longPress.current = setTimeout(() => { suppressClick.current = true; onEnterSelectMode(message._id); }, 550); }}
        onTouchMove={() => clearTimeout(longPress.current)} onTouchEnd={() => clearTimeout(longPress.current)} onTouchCancel={() => clearTimeout(longPress.current)}>
        {message.replyTo && <div className="quoted-message"><strong>{message.replyTo.sender?.fullName || "Reply"}</strong><p>{message.replyTo.content || (message.replyTo.messageType === "video" ? "Video" : message.replyTo.messageType === "image" ? "Photo" : "Message unavailable")}</p></div>}
        {hasMedia && <button className="message-media" onClick={(event) => { event.stopPropagation(); if (isSelectMode && persisted) onSelect(message._id); else if (persisted) setShowMedia(true); }} disabled={!persisted && !message.isOptimistic} aria-label={`Open ${message.messageType}`}>
          {message.messageType === "image" ? <img src={message.media?.url} alt="Shared photo" loading="lazy" /> : <><video src={message.media?.url} muted playsInline preload="metadata" /><span className="play-overlay"><HiOutlinePlay /></span></>}
          {message.isOptimistic && <span className="media-progress">{message.failed ? "Not sent" : `${message.uploadProgress || 0}%`}</span>}
          {!message.isOptimistic && timeLeft !== null && <span className="media-countdown"><HiOutlineClock /> {timeLeft}s</span>}
        </button>}
        <div className="message-text">
          {message.content && <p>{message.content}</p>}
          <div className="message-meta">
            {message.edited && <span>edited</span>}
            <time dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
            {isOwn && <span className={`message-status ${message.status === "seen" ? "seen" : ""}`} title={message.failed ? "Not sent" : message.status || "sent"} aria-label={message.failed ? "Not sent" : message.status || "sent"}>
              {message.failed ? "!" : message.status === "sending" ? <HiOutlineClock /> : <><HiCheck />{["delivered", "seen"].includes(message.status) && <HiCheck className="second-check" />}</>}
            </span>}
          </div>
        </div>
        {persisted && !isSelectMode && <div className="message-menu-wrap" data-message-menu>
          <button ref={buttonRef} className="message-menu-button" onClick={(event) => { event.stopPropagation(); setShowMenu(!showMenu); }} aria-label="Message options" aria-expanded={showMenu}><HiOutlineDotsVertical /></button>
          {showMenu && <div className={`dropdown message-menu ${isOwn ? "align-right" : "align-left"}`} role="menu" onClick={(event) => event.stopPropagation()}>
            <button role="menuitem" onClick={() => act(() => onReply(message))}><HiOutlineReply /> Reply</button>
            {message.content && <button role="menuitem" onClick={copy}><HiOutlineClipboardCopy /> Copy text</button>}
            {isOwn && message.messageType === "text" && <button role="menuitem" onClick={() => act(() => setEditing(true))}><HiOutlinePencil /> Edit</button>}
            <button role="menuitem" onClick={() => act(() => onEnterSelectMode(message._id))}><HiCheck /> Select</button>
            <button role="menuitem" onClick={() => act(() => onDeleteForMe(message._id))}><HiOutlineTrash /> Delete for me</button>
            {isOwn && <button role="menuitem" className="danger-text" onClick={() => act(() => onDeleteForEveryone(message._id))}><HiOutlineTrash /> Delete for everyone</button>}
          </div>}
        </div>}
      </div>
      {message.failed && <div className="message-failure"><span>Not sent</span><button onClick={() => message.messageType === "text" ? retryMessage(message.clientId) : retryMedia(message.clientId)}><HiOutlineRefresh /> Retry</button><button onClick={() => discardMessage(message._id)}>Discard</button></div>}
      {isOwn && isLastSeen && message.status === "seen" && <div className="seen-label">Seen {message.seenAt ? new Date(message.seenAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}</div>}
    </div>
    {hasMedia && <MediaViewer isOpen={showMedia} onClose={() => setShowMedia(false)} media={message.media} senderName={message.sender?.fullName || "User"} timestamp={message.createdAt} />}
    <EditMessageModal isOpen={editing} onClose={() => setEditing(false)} message={message} onSave={async (content) => { const saved = await onEdit(message._id, content); if (saved) setEditing(false); }} />
  </div>;
};
export default ChatBubble;
