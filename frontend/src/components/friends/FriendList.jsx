import Avatar from "../../components/common/Avatar";
import React, { useState } from "react";
import { HiOutlineUsers, HiOutlineUserRemove } from "react-icons/hi";
import toast from "react-hot-toast";
import { friendAPI } from "../../services/api";
import { useSocket } from "../../hooks/useSocket";
import { errorMessage } from "../../utils/messages";
import ConfirmDialog from "../common/ConfirmDialog";
const FriendList = ({ friends, loading, onFriendSelect, activeFriendId, onFriendRemoved }) => {
  const { isUserOnline } = useSocket();
  const [selected, setSelected] = useState(null), [busy, setBusy] = useState(false);
  const remove = async () => {
    setBusy(true);
    try { await friendAPI.removeFriend(selected._id); toast.success("Friend removed"); setSelected(null); onFriendRemoved?.(); }
    catch (error) { toast.error(errorMessage(error)); }
    finally { setBusy(false); }
  };
  if (loading) return <div className="inline-loading"><span className="spinner" /> Loading friends…</div>;
  return <>{!friends.length ? <div className="empty-state compact"><HiOutlineUsers /><h3>No friends found</h3><p>Use Add friend to find people you know.</p></div> : <div className="chat-list">{friends.map((friend) => <div className={`chat-list-item ${activeFriendId === friend._id ? "active" : ""}`} key={friend._id}><button className="chat-item-main" onClick={() => onFriendSelect(friend)}><div className="avatar-presence"><Avatar src={friend.avatar} alt="" />{isUserOnline(friend._id) && <i />}</div><div className="min-w-0 flex-1"><strong className="block truncate text-sm">{friend.fullName}</strong><p className="muted text-xs mt-1">{isUserOnline(friend._id) ? "Active now" : `@${friend.username}`}</p></div></button><button className="icon-button small friend-remove" onClick={() => setSelected(friend)} aria-label={`Remove ${friend.fullName} from friends`}><HiOutlineUserRemove /></button></div>)}</div>}
    <ConfirmDialog open={!!selected} onClose={() => setSelected(null)} title="Remove friend?" description={`Remove ${selected?.fullName || "this contact"} from your friends? Your existing conversation will be kept.`} confirmLabel="Remove friend" danger busy={busy} onConfirm={remove} />
  </>;
};
export default FriendList;
