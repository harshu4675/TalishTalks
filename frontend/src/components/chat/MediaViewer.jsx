import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HiOutlineX,
  HiOutlineDownload,
  HiOutlineZoomIn,
  HiOutlineZoomOut,
} from "react-icons/hi";
import toast from "react-hot-toast";
import { useBackButton } from "../../hooks/useBackButton";

const MediaViewer = ({ isOpen, onClose, media, senderName, timestamp }) => {
  const [zoom, setZoom] = useState(1);
  const [downloading, setDownloading] = useState(false);

  // Back button closes viewer
  useBackButton(isOpen, onClose);

  // Reset zoom when opening
  useEffect(() => {
    if (isOpen) setZoom(1);
  }, [isOpen]);

  if (!media) return null;

  const isVideo = media.type === "video";

  // 🔥 Download functionality
  const handleDownload = async () => {
    setDownloading(true);
    try {
      const response = await fetch(media.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;

      // Generate filename
      const ext = isVideo ? "mp4" : "jpg";
      const fileName = `talish-${Date.now()}.${ext}`;
      link.download = fileName;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("Downloaded successfully! 📥");
    } catch (err) {
      console.error("Download error:", err);
      toast.error("Failed to download");
    } finally {
      setDownloading(false);
    }
  };

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 3));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5));

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
          className="fixed inset-0 z-[400] bg-black flex flex-col"
        >
          {/* Header */}
          <div
            className="flex items-center justify-between p-4 backdrop-blur-md"
            style={{
              backgroundColor: "rgba(0,0,0,0.7)",
              paddingTop: "max(1rem, env(safe-area-inset-top))",
            }}
          >
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/10 text-white transition-colors"
            >
              <HiOutlineX className="text-2xl" />
            </button>

            <div className="text-center flex-1 mx-4">
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
              className="p-2 rounded-full hover:bg-white/10 text-white transition-colors disabled:opacity-50"
              title="Download"
            >
              {downloading ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <HiOutlineDownload className="text-2xl" />
              )}
            </button>
          </div>

          {/* Media Container */}
          <div
            className="flex-1 flex items-center justify-center overflow-hidden p-4 cursor-zoom-in"
            onClick={(e) => {
              if (e.target === e.currentTarget && !isVideo) {
                handleZoomIn();
              }
            }}
          >
            {isVideo ? (
              <video
                src={media.url}
                controls
                autoPlay
                className="max-w-full max-h-full"
                style={{ borderRadius: "8px" }}
              />
            ) : (
              <motion.img
                src={media.url}
                alt="Full view"
                animate={{ scale: zoom }}
                transition={{ type: "spring", stiffness: 200, damping: 25 }}
                className="max-w-full max-h-full object-contain select-none"
                style={{ borderRadius: "8px" }}
                draggable={false}
              />
            )}
          </div>

          {/* Zoom Controls (image only) */}
          {!isVideo && (
            <div
              className="flex items-center justify-center gap-3 p-4 backdrop-blur-md"
              style={{
                backgroundColor: "rgba(0,0,0,0.7)",
                paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
              }}
            >
              <button
                onClick={handleZoomOut}
                disabled={zoom <= 0.5}
                className="p-2 rounded-full hover:bg-white/10 text-white transition-colors disabled:opacity-30"
              >
                <HiOutlineZoomOut className="text-xl" />
              </button>
              <span className="text-white text-sm min-w-[60px] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={handleZoomIn}
                disabled={zoom >= 3}
                className="p-2 rounded-full hover:bg-white/10 text-white transition-colors disabled:opacity-30"
              >
                <HiOutlineZoomIn className="text-xl" />
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MediaViewer;
