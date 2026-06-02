import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  HiOutlineX,
  HiOutlinePaperAirplane,
  HiOutlineReply,
} from "react-icons/hi";

const MediaPreview = ({
  file,
  previewUrl,
  onSend,
  onCancel,
  replyTo,
  onCancelReply,
}) => {
  const [sending, setSending] = useState(false);

  const isVideo = file.type.startsWith("video/");
  const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);

  const handleSend = async () => {
    setSending(true);
    try {
      await onSend();
    } finally {
      setSending(false);
    }
  };

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className="overflow-hidden border-b"
      style={{ borderColor: "var(--color-border)" }}
    >
      <div className="p-3 space-y-2">
        {/* Reply Preview */}
        {replyTo && (
          <div
            className="flex items-center gap-2 p-2 rounded-lg"
            style={{
              backgroundColor: "var(--color-bgInput)",
              borderLeft: "3px solid var(--color-primary)",
            }}
          >
            <HiOutlineReply
              className="text-sm flex-shrink-0"
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
                {replyTo.content || "Media"}
              </p>
            </div>
            <button
              onClick={onCancelReply}
              className="p-1 rounded-md flex-shrink-0"
              style={{ color: "var(--color-textMuted)" }}
            >
              <HiOutlineX className="text-sm" />
            </button>
          </div>
        )}

        {/* Preview Container */}
        <div
          className="relative rounded-xl overflow-hidden"
          style={{
            backgroundColor: "var(--color-bg)",
            border: "1px solid var(--color-border)",
          }}
        >
          {/* Cancel Button */}
          <button
            onClick={onCancel}
            disabled={sending}
            className="absolute top-2 right-2 z-10 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md disabled:opacity-50"
            style={{
              backgroundColor: "rgba(0,0,0,0.6)",
              color: "white",
            }}
          >
            <HiOutlineX className="text-lg" />
          </button>

          {/* Media Preview */}
          <div className="flex items-center justify-center max-h-[300px] overflow-hidden">
            {isVideo ? (
              <video
                src={previewUrl}
                controls
                className="max-w-full max-h-[300px] object-contain"
              />
            ) : (
              <img
                src={previewUrl}
                alt="Preview"
                className="max-w-full max-h-[300px] object-contain"
              />
            )}
          </div>

          {/* File Info */}
          <div
            className="px-3 py-2 text-xs flex items-center justify-between"
            style={{
              backgroundColor: "var(--color-bgInput)",
              color: "var(--color-textMuted)",
            }}
          >
            <span className="truncate">
              {isVideo ? "📹" : "📷"} {file.name}
            </span>
            <span className="flex-shrink-0 ml-2">{fileSizeMB} MB</span>
          </div>
        </div>

        {/* Auto-delete warning */}
        <div
          className="p-2 rounded-lg text-xs flex items-start gap-2"
          style={{
            backgroundColor: "rgba(251, 54, 64, 0.1)",
            border: "1px solid var(--color-primary)",
            color: "var(--color-text)",
          }}
        >
          <span>⏱️</span>
          <p>
            This media will <strong>auto-delete after 2 minutes</strong> from
            everywhere (chat + cloud storage)
          </p>
        </div>

        {/* Send Button */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handleSend}
          disabled={sending}
          className="w-full py-3 rounded-xl text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-70"
          style={{
            background:
              "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primaryDark) 100%)",
          }}
        >
          {sending ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Uploading...</span>
            </>
          ) : (
            <>
              <HiOutlinePaperAirplane className="text-lg -rotate-45" />
              <span>Send {isVideo ? "Video" : "Photo"}</span>
            </>
          )}
        </motion.button>
      </div>
    </motion.div>
  );
};

export default MediaPreview;
