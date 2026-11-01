import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { HiOutlineX, HiOutlineDownload, HiOutlineZoomIn, HiOutlineZoomOut } from "react-icons/hi";
import toast from "react-hot-toast";
import { useBackButton } from "../../hooks/useBackButton";
const MediaViewer = ({ isOpen, onClose, media, senderName, timestamp }) => {
  const [zoom, setZoom] = useState(1), [downloading, setDownloading] = useState(false), [error, setError] = useState(false);
  const linkRef = useRef(null), blobRef = useRef(null), controllerRef = useRef(null);
  useBackButton(isOpen, onClose);
  useEffect(() => {
    if (!isOpen) return;
    setZoom(1); setError(false);
    const previous = document.activeElement;
    const key = (event) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("keydown", key); controllerRef.current?.abort(); if (blobRef.current) URL.revokeObjectURL(blobRef.current); if (previous?.isConnected) previous.focus(); };
  }, [isOpen, onClose]);
  if (!isOpen || !media) return null;
  const download = async () => {
    setDownloading(true); controllerRef.current = new AbortController();
    try {
      const response = await fetch(media.url, { signal: controllerRef.current.signal });
      if (!response.ok) throw new Error("Download failed");
      blobRef.current = URL.createObjectURL(await response.blob());
      const extension = media.url.split("?")[0].split(".").pop();
      linkRef.current.download = `talish-${Date.now()}.${/^[a-z0-9]{2,5}$/i.test(extension) ? extension : media.type === "video" ? "mp4" : "jpg"}`;
      linkRef.current.href = blobRef.current; linkRef.current.click(); toast.success("Download started");
    } catch (failure) { if (failure.name !== "AbortError") toast.error("Could not download this media. Check your connection and try again."); }
    finally { setDownloading(false); }
  };
  return createPortal(<div className="modal-backdrop media-viewer" role="dialog" aria-modal="true" aria-label="Media viewer">
    <header className="modal-header"><div className="min-w-0"><h2 className="truncate">{senderName || "Media"}</h2>{timestamp && <p className="muted text-xs mt-1">{new Date(timestamp).toLocaleString()}</p>}</div><div className="flex gap-1"><button className="icon-button" onClick={download} disabled={downloading} aria-label="Download media"><HiOutlineDownload /></button><button className="icon-button" onClick={onClose} aria-label="Close media viewer"><HiOutlineX /></button></div></header>
    <div className="media-viewer-content">{error ? <p>Media is unavailable. It may have expired or been deleted.</p> : media.type === "video" ? <video src={media.url} controls autoPlay playsInline onError={() => setError(true)} /> : <div className="overflow-auto max-h-full max-w-full"><img src={media.url} alt={`Media from ${senderName || "contact"}`} style={{ transform: `scale(${zoom})`, transformOrigin: "top center", maxWidth: zoom > 1 ? "none" : "100%", width: zoom > 1 ? `${zoom * 100}%` : undefined }} onError={() => setError(true)} /></div>}</div>
    {media.type !== "video" && !error && <footer className="modal-footer justify-center"><button className="icon-button" onClick={() => setZoom((value) => Math.max(.5, value - .25))} disabled={zoom <= .5} aria-label="Zoom out"><HiOutlineZoomOut /></button><span>{Math.round(zoom * 100)}%</span><button className="icon-button" onClick={() => setZoom((value) => Math.min(3, value + .25))} disabled={zoom >= 3} aria-label="Zoom in"><HiOutlineZoomIn /></button></footer>}
    <a ref={linkRef} hidden aria-hidden="true">Download</a>
  </div>, document.body);
};
export default MediaViewer;
