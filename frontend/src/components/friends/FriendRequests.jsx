import Avatar from "../../components/common/Avatar";
import React, { useState, useEffect, useCallback } from "react";
import { HiOutlineUserGroup, HiOutlineCheck, HiOutlineX } from "react-icons/hi";
import toast from "react-hot-toast";
import Modal from "../common/Modal";
import { friendAPI } from "../../services/api";
import { useSocket } from "../../hooks/useSocket";
import { errorMessage } from "../../utils/messages";
const FriendRequests = ({ isOpen, onClose, onRequestHandled }) => {
  const { socket } = useSocket();
  const [tab, setTab] = useState("received"), [received, setReceived] = useState([]), [sent, setSent] = useState([]);
  const [loading, setLoading] = useState(false), [processing, setProcessing] = useState(null), [error, setError] = useState("");
  const load = useCallback(async (signal) => {
    setLoading(true); setError("");
    try { const response = await friendAPI.getRequests({ signal }); setReceived(response.data.received); setSent(response.data.sent); }
    catch (failure) { if (failure.code !== "ERR_CANCELED") setError(errorMessage(failure)); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, []);
  useEffect(() => { if (!isOpen) return; const controller = new AbortController(); void load(controller.signal); return () => controller.abort(); }, [isOpen, load]);
  useEffect(() => {
    if (!socket || !isOpen) return;
    const refresh = () => void load();
    socket.on("friend_request_received", refresh); socket.on("friend_request_cancelled", refresh);
    return () => { socket.off("friend_request_received", refresh); socket.off("friend_request_cancelled", refresh); };
  }, [socket, isOpen, load]);
  const respond = async (request, action) => {
    setProcessing(request._id);
    try {
      if (tab === "sent") await friendAPI.cancelRequest(request._id); else await friendAPI.respond({ requestId: request._id, action });
      if (tab === "sent") setSent((previous) => previous.filter((item) => item._id !== request._id)); else setReceived((previous) => previous.filter((item) => item._id !== request._id));
      toast.success(tab === "sent" ? "Request cancelled" : action === "accept" ? "Friend request accepted" : "Request declined"); onRequestHandled?.();
    } catch (failure) { toast.error(errorMessage(failure)); }
    finally { setProcessing(null); }
  };
  const items = tab === "received" ? received : sent;
  return <Modal isOpen={isOpen} onClose={onClose} title="Friend requests">
    <div className="modal-body"><div className="auth-tabs"><button className={tab === "received" ? "active" : ""} onClick={() => setTab("received")}>Received ({received.length})</button><button className={tab === "sent" ? "active" : ""} onClick={() => setTab("sent")}>Sent ({sent.length})</button></div>
      {loading ? <div className="inline-loading"><span className="spinner" /> Loading requests…</div> : error ? <div className="inline-error"><p>{error}</p><button className="text-button" onClick={() => load()}>Retry</button></div> : !items.length ? <div className="empty-state compact"><HiOutlineUserGroup /><h3>No pending requests</h3><p>{tab === "received" ? "New friend requests will appear here." : "Requests you send will appear here."}</p></div> : <div className="space-y-2">{items.map((request) => {
        const person = tab === "received" ? request.sender : request.receiver;
        return <div className="settings-row" key={request._id}><Avatar className="w-10 h-10 rounded-full object-cover" src={person.avatar} alt="" /><div><strong className="truncate block">{person.fullName}</strong><p>@{person.username}</p></div><div className="!flex-none flex gap-1">{tab === "received" && <button className="icon-button brand-text" disabled={!!processing} onClick={() => respond(request, "accept")} aria-label={`Accept ${person.fullName}`}><HiOutlineCheck /></button>}<button className="icon-button" disabled={!!processing} onClick={() => respond(request, tab === "sent" ? "cancel" : "reject")} aria-label={`${tab === "sent" ? "Cancel" : "Decline"} request ${tab === "sent" ? "to" : "from"} ${person.fullName}`}><HiOutlineX /></button></div></div>;
      })}</div>}
    </div>
  </Modal>;
};
export default FriendRequests;
