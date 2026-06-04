import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  HiOutlineLogout,
  HiOutlineSearch,
  HiOutlineUserAdd,
  HiOutlineCog,
  HiOutlineBell,
  HiOutlineChatAlt2,
  HiOutlineUsers,
  HiOutlineShare,
} from "react-icons/hi";
import toast from "react-hot-toast";
import ThemeSwitcher from "../components/common/ThemeSwitcher";
import TalishLogo, { TalishLogoText } from "../assets/logo";
import { useAuth } from "../hooks/useAuth";
import { useSocket } from "../hooks/useSocket";
import { useFriends } from "../hooks/useFriends";
import { useChat } from "../hooks/useChat";
import { useBackButton } from "../hooks/useBackButton";
import FriendList from "../components/friends/FriendList";
import AddFriend from "../components/friends/AddFriend";
import FriendRequests from "../components/friends/FriendRequests";
import ChatList from "../components/chat/ChatList";
import ChatWindow from "../components/chat/ChatWindow";
import { chatAPI } from "../services/api";
import ProfileSettings from "../components/profile/ProfileSettings";
import InviteFriend from "../components/friends/InviteFriend";

const ChatPage = () => {
  const { user, logout } = useAuth();
  const { isConnected } = useSocket();
  const {
    friends,
    loadingFriends,
    pendingRequestsCount,
    fetchFriends,
    fetchPendingCount,
  } = useFriends();
  const {
    chats,
    fetchChats,
    loadingChats,
    activeChat,
    selectChat,
    closeChat,
    lockAllAgain,
    markChatsUnlocked,
    unlockedChats,
  } = useChat();

  const [showSettings, setShowSettings] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [showRequests, setShowRequests] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [activeTab, setActiveTab] = useState("chats");
  const [searchQuery, setSearchQuery] = useState("");
  const [creatingChat, setCreatingChat] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // 🔥 Hidden locked chats state
  const [revealLocked, setRevealLocked] = useState(false);
  const pinAttemptRef = useRef(null); // debounce pin tries

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        lockAllAgain();
        setRevealLocked(false);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [lockAllAgain]);

  useBackButton(!!activeChat && isMobile, () => {
    closeChat();
  });

  // 🔥 PIN-in-search detection
  useEffect(() => {
    // Clear any pending pin attempts
    if (pinAttemptRef.current) {
      clearTimeout(pinAttemptRef.current);
    }

    const trimmed = searchQuery.trim();

    // If user cleared search → hide locked again
    if (!trimmed) {
      if (revealLocked) {
        setRevealLocked(false);
        lockAllAgain();
      }
      return;
    }

    // Check if input is a 4-digit PIN
    const isPin = /^\d{4}$/.test(trimmed);
    if (!isPin) {
      // Not a PIN — hide locked if previously revealed
      if (revealLocked) {
        setRevealLocked(false);
        lockAllAgain();
      }
      return;
    }

    // Has locked chats?
    const lockedChats = chats.filter((c) => c.isLocked);
    if (lockedChats.length === 0) return;

    // Debounce — try unlock 400ms after typing stops
    pinAttemptRef.current = setTimeout(async () => {
      try {
        // Try to unlock with the first locked chat as verifier
        await chatAPI.unlock(lockedChats[0]._id, trimmed);
        markChatsUnlocked();
        setRevealLocked(true);
        toast.success("Locked chats revealed 🔓", { duration: 1500 });
        setSearchQuery(""); // Clear search to show all
      } catch (err) {
        // Silent fail — wrong PIN, do nothing
      }
    }, 400);

    return () => {
      if (pinAttemptRef.current) clearTimeout(pinAttemptRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, chats]);

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
    toast.success("Logged out successfully 👋");
  };

  const handleFriendClick = async (friend) => {
    setCreatingChat(true);
    try {
      const res = await chatAPI.create({ friendId: friend._id });
      const chat = res.data.chat;
      await fetchChats();
      selectChat(chat);
      setActiveTab("chats");
    } catch (err) {
      toast.error("Failed to open chat");
    } finally {
      setCreatingChat(false);
    }
  };

  // 🔥 Filter chats — exclude locked unless revealed
  const filteredChats = chats
    .filter((c) => {
      // Hide locked chats unless revealed
      if (c.isLocked && !revealLocked) return false;
      return true;
    })
    .filter(
      (c) =>
        c.otherUser?.fullName
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        c.otherUser?.username
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()),
    );

  const filteredFriends = friends.filter(
    (friend) =>
      friend.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      friend.username.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div
      className="h-screen flex overflow-hidden"
      style={{ backgroundColor: "var(--color-bg)" }}
    >
      {/* Sidebar */}
      <motion.div
        initial={{ x: -300, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className={`${
          activeChat ? "hidden lg:flex" : "flex"
        } w-full lg:w-96 flex-col`}
        style={{
          backgroundColor: "var(--color-bg)",
          borderRight: "1px solid var(--color-border)",
        }}
      >
        {/* Sidebar Header */}
        <div
          className="p-4 flex items-center justify-between"
          style={{ borderBottom: "1px solid var(--color-border)" }}
        >
          <TalishLogo size="sm" />
          <div className="flex items-center gap-1">
            <ThemeSwitcher />

            <button
              onClick={() => setShowRequests(true)}
              className="relative p-2 rounded-lg transition-colors hover:bg-black/10"
              style={{ color: "var(--color-textMuted)" }}
              title="Friend Requests"
            >
              <HiOutlineBell className="text-lg" />
              {pendingRequestsCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-0.5 -right-0.5 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 glow-pulse"
                  style={{ backgroundColor: "var(--color-primary)" }}
                >
                  {pendingRequestsCount > 9 ? "9+" : pendingRequestsCount}
                </motion.span>
              )}
            </button>

            <button
              onClick={() => setShowAddFriend(true)}
              className="p-2 rounded-lg transition-colors hover:bg-black/10"
              style={{ color: "var(--color-textMuted)" }}
              title="Add Friend"
            >
              <HiOutlineUserAdd className="text-lg" />
            </button>

            <button
              onClick={() => setShowInvite(true)}
              className="p-2 rounded-lg transition-colors hover:bg-black/10"
              style={{ color: "var(--color-textMuted)" }}
              title="Invite Friend"
            >
              <HiOutlineShare className="text-lg" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div
          className="flex px-3 pt-2 gap-1"
          style={{ backgroundColor: "var(--color-bgCard)" }}
        >
          <button
            onClick={() => setActiveTab("chats")}
            className="flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2"
            style={{
              backgroundColor:
                activeTab === "chats" ? "var(--color-bgInput)" : "transparent",
              color:
                activeTab === "chats"
                  ? "var(--color-text)"
                  : "var(--color-textMuted)",
              borderBottom:
                activeTab === "chats"
                  ? "2px solid var(--color-primary)"
                  : "2px solid transparent",
            }}
          >
            <HiOutlineChatAlt2 className="text-base" />
            Chats
            {chats.reduce((sum, c) => sum + (c.unreadCount || 0), 0) > 0 && (
              <span
                className="text-white text-[10px] rounded-full px-1.5 py-0.5 min-w-[18px]"
                style={{ backgroundColor: "var(--color-primary)" }}
              >
                {chats.reduce((sum, c) => sum + (c.unreadCount || 0), 0)}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("friends")}
            className="flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2"
            style={{
              backgroundColor:
                activeTab === "friends"
                  ? "var(--color-bgInput)"
                  : "transparent",
              color:
                activeTab === "friends"
                  ? "var(--color-text)"
                  : "var(--color-textMuted)",
              borderBottom:
                activeTab === "friends"
                  ? "2px solid var(--color-primary)"
                  : "2px solid transparent",
            }}
          >
            <HiOutlineUsers className="text-base" />
            Friends
            {friends.length > 0 && (
              <span
                className="text-[10px]"
                style={{ color: "var(--color-textMuted)" }}
              >
                ({friends.length})
              </span>
            )}
          </button>
        </div>

        {/* Search Bar */}
        <div
          className="p-3"
          style={{ borderBottom: "1px solid var(--color-border)" }}
        >
          <div className="relative">
            <HiOutlineSearch
              className="absolute left-3 top-1/2 -translate-y-1/2 text-base"
              style={{ color: "var(--color-textMuted)" }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${activeTab}...`}
              className="w-full rounded-xl pl-9 pr-3 py-2 text-sm transition-all focus:outline-none"
              style={{
                backgroundColor: "var(--color-bgInput)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text)",
              }}
            />
            {/* 🔥 Subtle indicator when locked chats are revealed */}
            {revealLocked && (
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs"
                title="Locked chats revealed"
              >
                🔓
              </motion.div>
            )}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {activeTab === "chats" ? (
            <ChatList
              chats={filteredChats}
              loading={loadingChats}
              activeChatId={activeChat?._id}
              onChatSelect={selectChat}
            />
          ) : (
            <FriendList
              friends={filteredFriends}
              loading={loadingFriends}
              activeFriendId={activeChat?.otherUser?._id}
              onFriendSelect={handleFriendClick}
              onFriendRemoved={() => {
                fetchFriends();
                fetchChats();
              }}
            />
          )}
        </div>

        {/* User Profile Area */}
        <div
          className="p-3"
          style={{ borderTop: "1px solid var(--color-border)" }}
        >
          <div className="flex items-center gap-3 p-2 rounded-xl transition-colors group hover:bg-black/5">
            <div className="relative">
              <img
                src={user?.avatar}
                alt={user?.fullName}
                className="w-11 h-11 rounded-full object-cover"
                style={{ border: "2px solid var(--color-primary)" }}
              />
              <div
                className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full"
                style={{
                  backgroundColor: isConnected
                    ? "#22c55e"
                    : "var(--color-textMuted)",
                  border: "2px solid var(--color-bg)",
                }}
              />
            </div>

            <div className="flex-1 min-w-0">
              <p
                className="text-sm font-semibold truncate"
                style={{ color: "var(--color-text)" }}
              >
                {user?.fullName}
              </p>
              <p
                className="text-xs truncate"
                style={{ color: "var(--color-textMuted)" }}
              >
                @{user?.username}
              </p>
            </div>

            <div className="flex items-center gap-1">
              <button
                className="p-2 rounded-lg transition-colors hover:bg-black/10"
                style={{ color: "var(--color-textMuted)" }}
                onClick={() => setShowSettings(true)}
                title="Settings"
              >
                <HiOutlineCog className="text-lg" />
              </button>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="p-2 rounded-lg hover:bg-red-500/10 transition-colors"
                style={{ color: "var(--color-textMuted)" }}
                title="Logout"
              >
                {loggingOut ? (
                  <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <HiOutlineLogout className="text-lg" />
                )}
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Chat Area */}
      <div
        className={`${
          activeChat ? "flex" : "hidden lg:flex"
        } flex-1 flex-col relative overflow-hidden`}
        style={{ backgroundColor: "var(--color-bg)" }}
      >
        {activeChat ? (
          <ChatWindow chat={activeChat} onBack={closeChat} />
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="flex-1 flex flex-col items-center justify-center relative overflow-hidden"
          >
            <div
              className="absolute top-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl"
              style={{ backgroundColor: "var(--color-glow)", opacity: 0.3 }}
            />

            <div className="text-center space-y-6 z-10 px-4">
              <div className="animate-float">
                <TalishLogo size="xl" />
              </div>

              <div className="space-y-2">
                <h2
                  className="text-2xl sm:text-3xl font-display font-bold"
                  style={{ color: "var(--color-text)" }}
                >
                  Welcome to <TalishLogoText />
                </h2>
                <p
                  className="max-w-sm mx-auto"
                  style={{ color: "var(--color-textMuted)" }}
                >
                  Select a chat from the sidebar or click on a friend to start a
                  new conversation 💬
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 mt-8 max-w-md mx-auto">
                <div
                  className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full"
                  style={{
                    color: "var(--color-textMuted)",
                    backgroundColor: "var(--color-bgCard)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  {isConnected ? "Connected" : "Connecting..."}
                </div>
                <div
                  className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full"
                  style={{
                    color: "var(--color-textMuted)",
                    backgroundColor: "var(--color-bgCard)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: "var(--color-primary)" }}
                  />
                  {chats.length} Chats
                </div>
                <div
                  className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full"
                  style={{
                    color: "var(--color-textMuted)",
                    backgroundColor: "var(--color-bgCard)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: "var(--color-secondary)" }}
                  />
                  {friends.length} Friends
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {creatingChat && (
          <div
            className="absolute inset-0 backdrop-blur-sm flex items-center justify-center z-50"
            style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          >
            <div className="flex flex-col items-center gap-3">
              <div
                className="w-10 h-10 border-[3px] border-t-transparent rounded-full animate-spin"
                style={{
                  borderColor: "var(--color-primary) transparent transparent",
                }}
              />
              <p
                className="text-sm"
                style={{ color: "var(--color-textMuted)" }}
              >
                Opening chat...
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <AddFriend
        isOpen={showAddFriend}
        onClose={() => setShowAddFriend(false)}
        onRequestSent={fetchPendingCount}
      />
      <FriendRequests
        isOpen={showRequests}
        onClose={() => setShowRequests(false)}
        onRequestHandled={() => {
          fetchFriends();
          fetchPendingCount();
        }}
      />
      <ProfileSettings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
      <InviteFriend isOpen={showInvite} onClose={() => setShowInvite(false)} />
    </div>
  );
};

export default ChatPage;
