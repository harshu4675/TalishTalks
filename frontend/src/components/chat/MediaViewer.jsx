import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HiOutlineX,
  HiOutlineDownload,
  HiOutlineArrowLeft,
  HiOutlineZoomIn,
  HiOutlineZoomOut,
} from "react-icons/hi";
import toast from "react-hot-toast";
import { useBackButton } from "../../hooks/useBackButton";

const MediaViewer = ({ isOpen, onClose, media, senderName, timestamp }) => {
  const [zoom, setZoom] = useState(1);
  const [downloading, setDownloading] = useState(false);

  useBackButton(isOpen, onClose);

  useEffect(() => {
    if (isOpen) setZoom(1);
  }, [isOpen]);

  if (!media) return null;

  const isVideo = media.type === "video";

  // 🔥 Download functionality
  const handleDownload = async (e) => {
    e?.stopPropagation();
    setDownloading(true);
    try {
      // Fetch the file
      const response = await fetch(media.url, { mode: "cors" });
      if (!response.ok) throw new Error("Failed to fetch");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;

      const ext = isVideo ? "mp4" : "jpg";
      const fileName = `talish-${Date.now()}.${ext}`;
      link.download = fileName;
      link.style.display = "none";

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("Downloaded! 📥");
    } catch (err) {
      console.error("Download error:", err);
      // Fallback: Open in new tab
      window.open(media.url, "_blank");
      toast.success("Opened in new tab - long press to save");
    } finally {
      setDownloading(false);
    }
  };

  const handleZoomIn = (e) => {
    e?.stopPropagation();
    setZoom((z) => Math.min(z + 0.25, 3));
  };
  const handleZoomOut = (e) => {
    e?.stopPropagation();
    setZoom((z) => Math.max(z - 0.25, 0.5));
  };

  const handleClose = (e) => {
    e?.stopPropagation();
    onClose();
  };

  const formatTime = (date) => {
    if (!date) return "";
    return new Date(date).toLocaleString([], {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] bg-black flex flex-col"
          style={{ touchAction: "manipulation" }}
        >
          {/* 🔥 HEADER - Always visible with back + download */}
          <div
            className="flex items-center justify-between p-3 backdrop-blur-md z-10 flex-shrink-0"
            style={{
              backgroundColor: "rgba(0,0,0,0.8)",
              paddingTop: "max(0.75rem, env(safe-area-inset-top))",
            }}
          >
            {/* Back/Close Button */}
            <button
              onClick={handleClose}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors flex items-center justify-center flex-shrink-0"
              title="Back"
            >
              <HiOutlineArrowLeft className="text-2xl" />
            </button>

            {/* Sender Info */}
            <div className="text-center flex-1 mx-2 min-w-0">
              {senderName && (
                <p className="text-sm font-semibold text-white truncate">
                  {senderName}
                </p>
              )}
              {timestamp && (
                <p className="text-xs text-white/70">{formatTime(timestamp)}</p>
              )}
            </div>

            {/* Download Button */}
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors flex items-center justify-center flex-shrink-0 disabled:opacity-50"
              title="Download"
            >
              {downloading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <HiOutlineDownload className="text-2xl" />
              )}
            </button>
          </div>

          {/* Media Container */}
          <div
            className="flex-1 flex items-center justify-center overflow-hidden p-2 relative"
            onClick={handleClose}
          >
            {isVideo ? (
              <video
                src={media.url}
                controls
                autoPlay
                playsInline
                onClick={(e) => e.stopPropagation()}
                className="max-w-full max-h-full"
                style={{ borderRadius: "8px" }}
              />
            ) : (
              <motion.img
                src={media.url}
                alt="Full view"
                animate={{ scale: zoom }}
                transition={{ type: "spring", stiffness: 200, damping: 25 }}
                onClick={(e) => e.stopPropagation()}
                className="max-w-full max-h-full object-contain select-none"
                style={{ borderRadius: "8px" }}
                draggable={false}
              />
            )}
          </div>

          {/* Bottom Controls */}
          <div
            className="backdrop-blur-md flex-shrink-0"
            style={{
              backgroundColor: "rgba(0,0,0,0.8)",
              paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))",
            }}
          >
            {/* Mobile Download Button (Big - more visible) */}
            <div className="p-3 flex items-center justify-center gap-3">
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="px-6 py-2.5 rounded-full text-white font-medium flex items-center gap-2 transition-all disabled:opacity-50"
                style={{
                  background:
                    "linear-gradient(135deg, var(--color-primary, #7c3aed) 0%, var(--color-primaryDark, #5b21b6) 100%)",
                  boxShadow: "0 4px 20px rgba(124, 58, 237, 0.5)",
                }}
              >
                {downloading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Downloading...</span>
                  </>
                ) : (
                  <>
                    <HiOutlineDownload className="text-lg" />
                    <span>Download {isVideo ? "Video" : "Photo"}</span>
                  </>
                )}
              </button>
            </div>

            {/* Zoom Controls (image only) */}
            {!isVideo && (
              <div className="flex items-center justify-center gap-3 pb-3">
                <button
                  onClick={handleZoomOut}
                  disabled={zoom <= 0.5}
                  className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors disabled:opacity-30 flex items-center justify-center"
                >
                  <HiOutlineZoomOut className="text-xl" />
                </button>
                <span className="text-white text-sm min-w-[60px] text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  onClick={handleZoomIn}
                  disabled={zoom >= 3}
                  className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors disabled:opacity-30 flex items-center justify-center"
                >
                  <HiOutlineZoomIn className="text-xl" />
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MediaViewer;
