import React, { useState, useRef, useEffect } from "react";
import { HiOutlinePaperAirplane, HiOutlineX, HiOutlineReply, HiOutlinePhotograph, HiOutlineVideoCamera, HiOutlinePlus, HiOutlineClock } from "react-icons/hi";
import toast from "react-hot-toast";
import MediaPreview from "./MediaPreview";

const ChatInput = ({ onSend, onSendMedia, onTypingStart, onTypingStop, disabled, replyTo, onCancelReply }) => {
  const [text, setText] = useState("");
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const textareaRef = useRef(null);
  const typingTimer = useRef(null);
  const typing = useRef(false);
  const imageInput = useRef(null), videoInput = useRef(null);
  const mounted = useRef(true);
  const stopRef = useRef(onTypingStop);
  stopRef.current = onTypingStop;
  const stopTyping = () => {
    clearTimeout(typingTimer.current);
    if (typing.current) stopRef.current?.();
    typing.current = false;
  };
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; clearTimeout(typingTimer.current); if (typing.current) stopRef.current?.(); };
  }, []);
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) { textarea.style.height = "auto"; textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`; }
  }, [text]);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);
  useEffect(() => { setText(""); setSelectedFile(null); stopTyping(); }, [disabled]);

  const handleChange = (event) => {
    setText(event.target.value);
    if (event.target.value && !typing.current) { typing.current = true; onTypingStart?.(); }
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(stopTyping, 1800);
  };
  const handleSend = async () => {
    const content = text.trim();
    if (!content || disabled) return;
    if (content.length > 5000) { toast.error("Messages can contain up to 5,000 characters."); return; }
    setText("");
    stopTyping();
    const sent = await onSend(content, replyTo);
    if (!mounted.current) return;
    if (sent) onCancelReply?.();
    else { setText((current) => current || content); toast.error("Your draft has been restored."); }
    textareaRef.current?.focus();
  };
  const handleFileSelect = (event, type) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const allowed = type === "image" ? ["image/jpeg", "image/png", "image/webp", "image/gif"] : ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"];
    if (!allowed.includes(file.type)) { toast.error(`Choose a supported ${type} format.`); return; }
    if (file.size > (type === "image" ? 5 : 25) * 1024 * 1024) { toast.error(`${type === "image" ? "Images" : "Videos"} must be smaller than ${type === "image" ? 5 : 25} MB.`); return; }
    setSelectedFile(file); setPreviewUrl(URL.createObjectURL(file)); setShowAttachMenu(false);
  };
  const handleSendMedia = async () => {
    if (!selectedFile || uploading) return;
    setUploading(true); setUploadProgress(0);
    try {
      const sent = await onSendMedia(selectedFile, replyTo, setUploadProgress);
      if (mounted.current) { setSelectedFile(null); if (sent) onCancelReply?.(); }
    } finally { if (mounted.current) setUploading(false); }
  };
  if (disabled) return <div className="composer-unavailable">Messaging is unavailable in this conversation.</div>;
  return <div className="composer">
    {selectedFile && previewUrl && <MediaPreview file={selectedFile} previewUrl={previewUrl} onSend={handleSendMedia} onCancel={() => { if (!uploading) setSelectedFile(null); }} sending={uploading} progress={uploadProgress} />}
    {replyTo && !selectedFile && <div className="reply-preview">
      <HiOutlineReply />
      <div className="min-w-0 flex-1"><strong>{replyTo.sender?.fullName || "Message"}</strong><p className="truncate">{replyTo.content || (replyTo.messageType === "video" ? "Video" : "Photo")}</p></div>
      <button className="icon-button" onClick={onCancelReply} aria-label="Cancel reply"><HiOutlineX /></button>
    </div>}
    {!selectedFile && <form className="composer-row" onSubmit={(event) => { event.preventDefault(); void handleSend(); }}>
      <div className="relative">
        <button type="button" className="icon-button" aria-label="Attach media" aria-expanded={showAttachMenu} onClick={() => setShowAttachMenu(!showAttachMenu)}><HiOutlinePlus /></button>
        {showAttachMenu && <><button type="button" className="menu-dismiss" aria-label="Close attachment menu" onClick={() => setShowAttachMenu(false)} /><div className="dropdown attach-menu">
          <button type="button" onClick={() => imageInput.current?.click()}><HiOutlinePhotograph /> Photo <span className="muted text-xs">5 MB</span></button>
          <button type="button" onClick={() => videoInput.current?.click()}><HiOutlineVideoCamera /> Video <span className="muted text-xs">25 MB</span></button>
        </div></>}
      </div>
      <input ref={imageInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={(event) => handleFileSelect(event, "image")} />
      <input ref={videoInput} type="file" accept="video/mp4,video/webm,video/quicktime,video/x-msvideo" hidden onChange={(event) => handleFileSelect(event, "video")} />
      <textarea ref={textareaRef} value={text} onChange={handleChange} onKeyDown={(event) => {
        if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void handleSend(); }
      }} placeholder="Aa" aria-label="Message" rows={1} maxLength={5000} />
      <button type="submit" className="send-button" disabled={!text.trim()} aria-label="Send message"><HiOutlinePaperAirplane /></button>
    </form>}
    <div className="composer-note"><HiOutlineClock /> Photos and videos are automatically deleted after 2 minutes.</div>
  </div>;
};
export default ChatInput;
