import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HiOutlineX,
  HiOutlineCheck,
  HiOutlineUserGroup,
  HiOutlineClock,
} from "react-icons/hi";
import toast from "react-hot-toast";
import { friendAPI } from "../../services/api";
import { useSocket } from "../../hooks/useSocket";

const FriendRequests = ({ isOpen, onClose, onRequestHandled }) => {
  const [activeTab, setActiveTab] = useState("received"); // 'received' | 'sent'
  const [received, setReceived] = useState([]);
  const [sent, setSent] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState(null);

  const { socket } = useSocket();

  // Fetch requests when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchRequests();
    }
  }, [isOpen]);

  // Listen for new friend requests via socket
  useEffect(() => {
    if (!socket) return;

    const handleNewRequest = () => {
      if (isOpen) fetchRequests();
    };

    socket.on("friend_request_received", handleNewRequest);
    socket.on("friend_request_cancelled", handleNewRequest);

    return () => {
      socket.off("friend_request_received", handleNewRequest);
      socket.off("friend_request_cancelled", handleNewRequest);
    };
  }, [socket, isOpen]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await friendAPI.getRequests();
      setReceived(res.data.received || []);
      setSent(res.data.sent || []);
    } catch (err) {
      toast.error("Failed to load friend requests");
    } finally {
      setLoading(false);
    }
  };

  const handleResponse = async (requestId, action) => {
    setProcessingId(requestId);
    try {
      const res = await friendAPI.respond({ requestId, action });
      toast.success(res.data.message);
      setReceived((prev) => prev.filter((r) => r._id !== requestId));
      if (onRequestHandled) onRequestHandled();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to respond");
    } finally {
      setProcessingId(null);
    }
  };

  const handleCancel = async (requestId) => {
    setProcessingId(requestId);
    try {
      await friendAPI.cancelRequest(requestId);
      toast.success("Request cancelled");
      setSent((prev) => prev.filter((r) => r._id !== requestId));
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to cancel");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
              w-full max-w-md mx-4 bg-dark-50 rounded-2xl border border-dark-200/50
              shadow-card-hover z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="p-5 border-b border-dark-200/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-accent flex items-center justify-center">
                  <HiOutlineUserGroup className="text-white text-lg" />
                </div>
                <div>
                  <h3 className="text-lg font-display font-semibold text-offwhite">
                    Friend Requests
                  </h3>
                  <p className="text-xs text-gray-soft">
                    Manage your friend requests
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-dark-100 text-gray-soft hover:text-offwhite transition-colors"
              >
                <HiOutlineX className="text-lg" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex bg-dark px-5 pt-4 gap-2">
              <button
                onClick={() => setActiveTab("received")}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 flex items-center justify-center gap-2 ${
                  activeTab === "received"
                    ? "bg-dark-100 text-offwhite border-b-2 border-accent"
                    : "text-gray-soft hover:text-offwhite"
                }`}
              >
                Received
                {received.length > 0 && (
                  <span className="px-1.5 py-0.5 text-xs bg-accent text-white rounded-full min-w-[20px]">
                    {received.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab("sent")}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 flex items-center justify-center gap-2 ${
                  activeTab === "sent"
                    ? "bg-dark-100 text-offwhite border-b-2 border-accent"
                    : "text-gray-soft hover:text-offwhite"
                }`}
              >
                Sent
                {sent.length > 0 && (
                  <span className="px-1.5 py-0.5 text-xs bg-dark-200 text-gray-soft rounded-full min-w-[20px]">
                    {sent.length}
                  </span>
                )}
              </button>
            </div>

            {/* List */}
            <div className="max-h-96 overflow-y-auto scrollbar-thin p-4">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-3 rounded-xl bg-dark-100/50 animate-pulse"
                    >
                      <div className="w-11 h-11 rounded-full skeleton" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 skeleton rounded w-1/2" />
                        <div className="h-3 skeleton rounded w-1/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : activeTab === "received" ? (
                received.length === 0 ? (
                  <EmptyState
                    icon="📭"
                    text="No pending requests"
                    subtext="When someone sends you a request, it'll show up here"
                  />
                ) : (
                  <div className="space-y-2">
                    {received.map((request, index) => (
                      <motion.div
                        key={request._id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center gap-3 p-3 rounded-xl bg-dark-100/50 hover:bg-dark-100 transition-colors"
                      >
                        <div className="relative">
                          <img
                            src={request.sender.avatar}
                            alt={request.sender.fullName}
                            className="w-11 h-11 rounded-full object-cover border border-dark-200"
                          />
                          {request.sender.isOnline && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-dark-50" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-offwhite truncate">
                            {request.sender.fullName}
                          </p>
                          <p className="text-xs text-gray-soft truncate">
                            @{request.sender.username}
                          </p>
                        </div>

                        <div className="flex gap-1.5">
                          <button
                            onClick={() =>
                              handleResponse(request._id, "accept")
                            }
                            disabled={processingId === request._id}
                            className="p-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors disabled:opacity-50"
                            title="Accept"
                          >
                            <HiOutlineCheck className="text-base" />
                          </button>
                          <button
                            onClick={() =>
                              handleResponse(request._id, "reject")
                            }
                            disabled={processingId === request._id}
                            className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50"
                            title="Reject"
                          >
                            <HiOutlineX className="text-base" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )
              ) : sent.length === 0 ? (
                <EmptyState
                  icon="📤"
                  text="No sent requests"
                  subtext="Requests you send will appear here"
                />
              ) : (
                <div className="space-y-2">
                  {sent.map((request, index) => (
                    <motion.div
                      key={request._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center gap-3 p-3 rounded-xl bg-dark-100/50"
                    >
                      <div className="relative">
                        <img
                          src={request.receiver.avatar}
                          alt={request.receiver.fullName}
                          className="w-11 h-11 rounded-full object-cover border border-dark-200"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-offwhite truncate">
                          {request.receiver.fullName}
                        </p>
                        <p className="text-xs text-gray-soft truncate flex items-center gap-1">
                          <HiOutlineClock className="text-xs" /> Pending
                        </p>
                      </div>

                      <button
                        onClick={() => handleCancel(request._id)}
                        disabled={processingId === request._id}
                        className="px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// Empty state helper
const EmptyState = ({ icon, text, subtext }) => (
  <div className="text-center py-12">
    <div className="text-5xl mb-3">{icon}</div>
    <p className="text-sm font-medium text-offwhite">{text}</p>
    <p className="text-xs text-gray-soft mt-1">{subtext}</p>
  </div>
);

export default FriendRequests;
