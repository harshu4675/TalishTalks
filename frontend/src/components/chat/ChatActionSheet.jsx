import React from "react";
import { HiOutlineTrash, HiOutlineLockClosed, HiOutlineLockOpen, HiOutlineBan, HiOutlineCheckCircle, HiOutlineUserRemove, HiOutlineCheck } from "react-icons/hi";
import { TbPin, TbPinnedOff } from "react-icons/tb";
import { HiOutlineBellSlash, HiOutlineBell } from "react-icons/hi2";
import Modal from "../common/Modal";
const ChatActionSheet = ({ isOpen, chat, onClose, onAction }) => {
  if (!chat) return null;
  const actions = [
    ["pin", chat.isPinned ? "Unpin chat" : "Pin chat", chat.isPinned ? <TbPinnedOff /> : <TbPin />],
    ["mute", chat.isMuted ? "Unmute notifications" : "Mute notifications", chat.isMuted ? <HiOutlineBell /> : <HiOutlineBellSlash />],
    ["markUnread", chat.isMarkedUnread ? "Mark as read" : "Mark as unread", <HiOutlineCheckCircle />],
    ["lock", chat.isLocked ? "Remove lock" : "Lock chat", chat.isLocked ? <HiOutlineLockOpen /> : <HiOutlineLockClosed />],
    ["select", "Select conversations", <HiOutlineCheck />],
    ["block", chat.iBlockedThem ? "Unblock contact" : "Block contact", <HiOutlineBan />],
    ["removeFriend", "Remove friend", <HiOutlineUserRemove />],
    ["delete", "Delete chat for me", <HiOutlineTrash />],
  ];
  return <Modal isOpen={isOpen} onClose={onClose} title={chat.otherUser?.fullName} description={`@${chat.otherUser?.username}`}><div className="p-2">{actions.map(([id, label, icon]) => <button key={id} className={`w-full flex items-center gap-3 text-left px-4 py-3 rounded-lg hover:bg-canvas ${["block", "removeFriend", "delete"].includes(id) && !chat.iBlockedThem ? "danger-text" : ""}`} onClick={() => { onClose(); onAction(id); }}>{icon}{label}</button>)}</div></Modal>;
};
export default ChatActionSheet;
