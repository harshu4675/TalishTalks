import React from "react";
import { HiOutlinePhotograph, HiOutlineVideoCamera } from "react-icons/hi";
import Modal from "../common/Modal";
const MediaPreview = ({ file, previewUrl, onCancel, onSend, sending, progress = 0 }) => <Modal isOpen={!!file} onClose={onCancel} closeDisabled={sending} title="Send media">
  {file && <><div className="modal-body"><div className="media-preview-box">{file.type.startsWith("video/") ? <video src={previewUrl} controls playsInline preload="metadata" /> : <img src={previewUrl} alt="Selected media preview" />}</div><div className="flex items-center gap-2 mt-3 muted text-sm">{file.type.startsWith("video/") ? <HiOutlineVideoCamera /> : <HiOutlinePhotograph />}<span className="truncate">{file.name}</span><span className="ml-auto flex-none">{(file.size / 1024 / 1024).toFixed(1)} MB</span></div></div><footer className="modal-footer"><button className="button secondary" onClick={onCancel} disabled={sending}>Choose another</button><button className="button primary" onClick={onSend} disabled={sending}>{sending ? `Sending ${progress}%` : "Send media"}</button></footer></>}
</Modal>;
export default MediaPreview;
