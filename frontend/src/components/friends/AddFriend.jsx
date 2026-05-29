import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HiOutlineX, HiOutlineSearch, HiOutlineUserAdd } from "react-icons/hi";
import toast from "react-hot-toast";
import { friendAPI, userAPI } from "../../services/api";

const AddFriend = ({ isOpen, onClose, onRequestSent }) => {
  const [username, setUsername] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [sendingTo, setSendingTo] = useState(null);

  useEffect(() => {
    if (!username || username.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);

    const timer = setTimeout(async () => {
      try {
        const res = await userAPI.search(username);
        setSearchResults(res.data.users || []);
      } catch (err) {
        console.error("Search error:", err);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [username]);

  useEffect(() => {
    if (!isOpen) {
      setUsername("");
      setSearchResults([]);
    }
  }, [isOpen]);

  const handleSendRequest = async (targetUsername) => {
    setSendingTo(targetUsername);

    try {
      const res = await friendAPI.sendRequest({
        username: targetUsername,
      });

      toast.success(res.data.message);

      if (onRequestSent) onRequestSent();

      setSearchResults((prev) =>
        prev.filter((u) => u.username !== targetUsername),
      );
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send request");
    } finally {
      setSendingTo(null);
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

          {/* Centered Modal Wrapper */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-md bg-dark-50 rounded-2xl border border-dark-200/50 shadow-card-hover overflow-hidden"
            >
              {/* Header */}
              <div className="p-5 border-b border-dark-200/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-accent flex items-center justify-center">
                    <HiOutlineUserAdd className="text-white text-lg" />
                  </div>

                  <div>
                    <h3 className="text-lg font-display font-semibold text-offwhite">
                      Add Friend
                    </h3>
                    <p className="text-xs text-gray-soft">
                      Search by username or name
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

              {/* Search */}
              <div className="p-5">
                <div className="relative">
                  <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-soft text-lg" />

                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Search users..."
                    autoFocus
                    className="input-dark pl-10 pr-10 w-full"
                  />

                  {searching && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
              </div>

              {/* Results */}
              <div className="max-h-[50vh] overflow-y-auto scrollbar-thin px-5 pb-5">
                {username.length < 2 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-2">🔍</div>
                    <p className="text-sm text-gray-soft">
                      Type at least 2 characters to search
                    </p>
                  </div>
                ) : searching ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 p-3 rounded-xl bg-dark-100/50 animate-pulse"
                      >
                        <div className="w-10 h-10 rounded-full skeleton" />

                        <div className="flex-1 space-y-2">
                          <div className="h-4 skeleton rounded w-1/2" />
                          <div className="h-3 skeleton rounded w-1/3" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-2">😕</div>
                    <p className="text-sm text-gray-soft">
                      No users found for "{username}"
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {searchResults.map((user, index) => (
                      <motion.div
                        key={user._id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center gap-3 p-3 rounded-xl bg-dark-100/50 hover:bg-dark-100 transition-colors"
                      >
                        <div className="relative">
                          <img
                            src={user.avatar}
                            alt={user.fullName}
                            className="w-11 h-11 rounded-full object-cover border border-dark-200"
                          />

                          {user.isOnline && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-dark-50" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-offwhite truncate">
                            {user.fullName}
                          </p>

                          <p className="text-xs text-gray-soft truncate">
                            @{user.username}
                          </p>
                        </div>

                        <button
                          onClick={() => handleSendRequest(user.username)}
                          disabled={sendingTo === user.username}
                          className="px-3 py-1.5 text-xs font-medium bg-gradient-accent text-white rounded-lg hover:shadow-glow transition-all duration-300 disabled:opacity-50 flex items-center gap-1.5"
                        >
                          {sendingTo === user.username ? (
                            <>
                              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              Sending
                            </>
                          ) : (
                            <>
                              <HiOutlineUserAdd className="text-sm" />
                              Add
                            </>
                          )}
                        </button>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-5 py-3 bg-dark border-t border-dark-200/50">
                <p className="text-xs text-gray-soft/60 text-center">
                  💡 Tip: Use exact username to find specific users faster
                </p>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default AddFriend;
