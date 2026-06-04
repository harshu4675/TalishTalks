import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HiOutlinePaperAirplane,
  HiOutlineEmojiHappy,
  HiOutlineX,
  HiOutlineReply,
  HiOutlinePhotograph,
  HiOutlineVideoCamera,
  HiOutlinePlus,
} from "react-icons/hi";
import toast from "react-hot-toast";
import MediaPreview from "./MediaPreview";

const ChatInput = ({
  onSend,
  onSendMedia,
  onTypingStart,
  onTypingStop,
  disabled,
  replyTo,
  onCancelReply,
}) => {
  const [text, setText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const textareaRef = useRef(null);
  const typingTimerRef = useRef(null);
  const containerRef = useRef(null);
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        120,
      )}px`;
    }
  }, [text]);

  useEffect(() => {
    if (textareaRef.current && !disabled && replyTo) {
      textareaRef.current.focus();
    }
  }, [disabled, replyTo]);

  const handleChange = (e) => {
    const value = e.target.value;
    setText(value);

    if (value.length > 0 && !isTyping) {
      setIsTyping(true);
      if (onTypingStart) onTypingStart();
    }

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);

    typingTimerRef.current = setTimeout(() => {
      setIsTyping(false);
      if (onTypingStop) onTypingStop();
    }, 1500);
  };

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;

    onSend(trimmed, replyTo);
    setText("");
    setIsTyping(false);
    if (onTypingStop) onTypingStop();
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === "image") {
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image must be less than 5MB");
        return;
      }
    } else if (type === "video") {
      if (!file.type.startsWith("video/")) {
        toast.error("Please select a video file");
        return;
      }
      if (file.size > 25 * 1024 * 1024) {
        toast.error("Video must be less than 25MB");
        return;
      }
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setShowAttachMenu(false);
    e.target.value = "";
  };

  const handleSendMedia = async () => {
    if (!selectedFile || !onSendMedia) return;
    await onSendMedia(selectedFile, replyTo);
    setSelectedFile(null);
    setPreviewUrl("");
  };

  const handleCancelMedia = () => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl("");
  };

  useEffect(() => {
    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      if (onTypingStop) onTypingStop();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 🔥 Phase 7: If blocked, show disabled state instead of full input
  if (disabled) {
    return (
      <div
        className="border-t backdrop-blur-md"
        style={{
          backgroundColor: "var(--color-bgCard)",
          borderColor: "var(--color-border)",
        }}
      >
        <div className="p-3">
          <div
            className="flex items-center justify-center gap-2 rounded-2xl p-3"
            style={{
              backgroundColor: "var(--color-bgInput)",
              border: "1px solid var(--color-border)",
              opacity: 0.5,
            }}
          >
            <HiOutlinePaperAirplane
              className="text-lg -rotate-45"
              style={{ color: "var(--color-textMuted)" }}
            />
            <span
              className="text-sm"
              style={{ color: "var(--color-textMuted)" }}
            >
              Messaging unavailable
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="border-t backdrop-blur-md"
      style={{
        backgroundColor: "var(--color-bgCard)",
        borderColor: "var(--color-border)",
      }}
    >
      {/* Media Preview */}
      <AnimatePresence>
        {selectedFile && previewUrl && (
          <MediaPreview
            file={selectedFile}
            previewUrl={previewUrl}
            onSend={handleSendMedia}
            onCancel={handleCancelMedia}
            replyTo={replyTo}
            onCancelReply={onCancelReply}
          />
        )}
      </AnimatePresence>

      {/* Reply Preview (when no media) */}
      <AnimatePresence>
        {replyTo && !selectedFile && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b"
            style={{ borderColor: "var(--color-border)" }}
          >
            <div
              className="flex items-center gap-2 p-2 mx-3 my-2 rounded-lg"
              style={{
                backgroundColor: "var(--color-bgInput)",
                borderLeft: "3px solid var(--color-primary)",
              }}
            >
              <HiOutlineReply
                className="text-base flex-shrink-0"
                style={{ color: "var(--color-primary)" }}
              />
              <div className="flex-1 min-w-0">
                <p
                  className="text-xs font-semibold truncate"
                  style={{ color: "var(--color-primary)" }}
                >
                  {replyTo.sender?.fullName || "Replying to"}
                </p>
                <p
                  className="text-xs truncate"
                  style={{ color: "var(--color-textMuted)" }}
                >
                  {replyTo.messageType === "image"
                    ? "📷 Photo"
                    : replyTo.messageType === "video"
                      ? "📹 Video"
                      : replyTo.content}
                </p>
              </div>
              <button
                onClick={onCancelReply}
                className="p-1 rounded-md flex-shrink-0"
                style={{ color: "var(--color-textMuted)" }}
              >
                <HiOutlineX className="text-base" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!selectedFile && (
        <div className="p-3">
          <div
            className="flex items-end gap-2 rounded-2xl p-2 transition-colors"
            style={{
              backgroundColor: "var(--color-bgInput)",
              border: "1px solid var(--color-border)",
            }}
          >
            {/* Attach Button */}
            <div className="relative">
              <button
                onClick={() => !disabled && setShowAttachMenu(!showAttachMenu)}
                disabled={disabled}
                className="p-2 flex-shrink-0 transition-colors rounded-lg hover:bg-black/20 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ color: "var(--color-textMuted)" }}
                onMouseDown={(e) => e.preventDefault()}
              >
                <motion.div
                  animate={{ rotate: showAttachMenu ? 45 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <HiOutlinePlus className="text-xl" />
                </motion.div>
              </button>

              {/* Attach Menu */}
              <AnimatePresence>
                {showAttachMenu && !disabled && (
                  <>
                    <div
                      onClick={() => setShowAttachMenu(false)}
                      className="fixed inset-0 z-40"
                    />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: 10 }}
                      transition={{ duration: 0.15 }}
                      className="absolute bottom-full left-0 mb-2 z-50 rounded-2xl shadow-2xl overflow-hidden min-w-[180px]"
                      style={{
                        backgroundColor: "var(--color-bgCard)",
                        border: "1px solid var(--color-border)",
                      }}
                    >
                      <button
                        onClick={() => imageInputRef.current?.click()}
                        className="w-full px-4 py-3 text-left text-sm flex items-center gap-3 transition-colors hover:bg-black/20"
                        style={{ color: "var(--color-text)" }}
                      >
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center"
                          style={{
                            backgroundColor: "rgba(59, 130, 246, 0.2)",
                          }}
                        >
                          <HiOutlinePhotograph
                            className="text-lg"
                            style={{ color: "#3B82F6" }}
                          />
                        </div>
                        <div>
                          <p className="font-medium">Photo</p>
                          <p
                            className="text-[10px]"
                            style={{ color: "var(--color-textMuted)" }}
                          >
                            Max 5MB
                          </p>
                        </div>
                      </button>
                      <button
                        onClick={() => videoInputRef.current?.click()}
                        className="w-full px-4 py-3 text-left text-sm flex items-center gap-3 transition-colors hover:bg-black/20 border-t"
                        style={{
                          color: "var(--color-text)",
                          borderColor: "var(--color-border)",
                        }}
                      >
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center"
                          style={{
                            backgroundColor: "rgba(239, 68, 68, 0.2)",
                          }}
                        >
                          <HiOutlineVideoCamera
                            className="text-lg"
                            style={{ color: "#EF4444" }}
                          />
                        </div>
                        <div>
                          <p className="font-medium">Video</p>
                          <p
                            className="text-[10px]"
                            style={{ color: "var(--color-textMuted)" }}
                          >
                            Max 25MB · 2 min
                          </p>
                        </div>
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Hidden file inputs */}
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleFileSelect(e, "image")}
              className="hidden"
            />
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              onChange={(e) => handleFileSelect(e, "video")}
              className="hidden"
            />

            <textarea
              ref={textareaRef}
              value={text}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              disabled={disabled}
              rows={1}
              className="flex-1 bg-transparent text-sm resize-none outline-none max-h-[120px] py-2 scrollbar-thin"
              style={{ color: "var(--color-text)" }}
            />

            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleSend}
              onMouseDown={(e) => e.preventDefault()}
              disabled={!text.trim() || disabled}
              className="p-2.5 rounded-xl flex-shrink-0 transition-all duration-200"
              style={{
                background:
                  text.trim() && !disabled
                    ? `linear-gradient(135deg, var(--color-primary) 0%, var(--color-primaryDark) 100%)`
                    : "var(--color-border)",
                color:
                  text.trim() && !disabled
                    ? "#FFFFFF"
                    : "var(--color-textMuted)",
                cursor: text.trim() && !disabled ? "pointer" : "not-allowed",
                boxShadow:
                  text.trim() && !disabled
                    ? "0 0 15px var(--color-glow)"
                    : "none",
              }}
            >
              <HiOutlinePaperAirplane className="text-lg -rotate-45" />
            </motion.button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatInput;
