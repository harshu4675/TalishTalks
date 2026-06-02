import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  HiOutlineLogout,
  HiOutlineSearch,
  HiOutlineUserAdd,
  HiOutlineCog,
  HiOutlineBell,
  HiOutlineChatAlt2,
  HiOutlineUsers,
} from "react-icons/hi";
import toast from "react-hot-toast";
import ThemeSwitcher from "../components/common/ThemeSwitcher";
import TalishLogo, { TalishLogoText } from "../assets/logo";
import { useAuth } from "../hooks/useAuth";
import { useSocket } from "../hooks/useSocket";
import { useFriends } from "../hooks/useFriends";
import { useChat } from "../hooks/useChat";
import { useBackButton } from "../hooks/useBackButton"; // 🔥 NEW
import FriendList from "../components/friends/FriendList";
import AddFriend from "../components/friends/AddFriend";
import FriendRequests from "../components/friends/FriendRequests";
import ChatList from "../components/chat/ChatList";
import ChatWindow from "../components/chat/ChatWindow";
import { chatAPI } from "../services/api";
import ProfileSettings from "../components/profile/ProfileSettings";

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
  const { chats, fetchChats, loadingChats, activeChat, selectChat, closeChat } =
    useChat();
  const [showSettings, setShowSettings] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [showRequests, setShowRequests] = useState(false);
  const [activeTab, setActiveTab] = useState("chats");
  const [searchQuery, setSearchQuery] = useState("");
  const [creatingChat, setCreatingChat] = useState(false);

  // 🔥 NEW: Detect mobile view
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // 🔥 NEW: Back button handling for active chat (mobile only)
  // When user is in a chat on mobile, back button should close the chat
  useBackButton(!!activeChat && isMobile, () => {
    closeChat();
  });

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

  const filteredChats = chats.filter(
    (c) =>
      c.otherUser?.fullName
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      c.otherUser?.username?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const filteredFriends = friends.filter(
    (friend) =>
      friend.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      friend.username.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="h-screen bg-dark flex overflow-hidden">
      {/* Sidebar */}
      <motion.div
        initial={{ x: -300, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className={`${
          activeChat ? "hidden lg:flex" : "flex"
        } w-full lg:w-96 border-r border-dark-200/50 flex-col bg-dark`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-dark-200/50 flex items-center justify-between">
          <TalishLogo size="sm" />
          <div className="flex items-center gap-1">
            <ThemeSwitcher />
            <button
              onClick={() => setShowRequests(true)}
              className="relative p-2 rounded-lg hover:bg-dark-100 text-gray-soft hover:text-offwhite transition-colors"
              title="Friend Requests"
            >
              <HiOutlineBell className="text-lg" />
              {pendingRequestsCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-0.5 -right-0.5 bg-accent text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 glow-pulse"
                >
                  {pendingRequestsCount > 9 ? "9+" : pendingRequestsCount}
                </motion.span>
              )}
            </button>

            <button
              onClick={() => setShowAddFriend(true)}
              className="p-2 rounded-lg hover:bg-dark-100 text-gray-soft hover:text-offwhite transition-colors"
              title="Add Friend"
            >
              <HiOutlineUserAdd className="text-lg" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-dark-50 px-3 pt-2 gap-1">
          <button
            onClick={() => setActiveTab("chats")}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
              activeTab === "chats"
                ? "bg-dark-100 text-offwhite border-b-2 border-accent"
                : "text-gray-soft hover:text-offwhite"
            }`}
          >
            <HiOutlineChatAlt2 className="text-base" />
            Chats
            {chats.reduce((sum, c) => sum + (c.unreadCount || 0), 0) > 0 && (
              <span className="bg-accent text-white text-[10px] rounded-full px-1.5 py-0.5 min-w-[18px]">
                {chats.reduce((sum, c) => sum + (c.unreadCount || 0), 0)}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("friends")}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
              activeTab === "friends"
                ? "bg-dark-100 text-offwhite border-b-2 border-accent"
                : "text-gray-soft hover:text-offwhite"
            }`}
          >
            <HiOutlineUsers className="text-base" />
            Friends
            {friends.length > 0 && (
              <span className="text-[10px] text-gray-soft">
                ({friends.length})
              </span>
            )}
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b border-dark-200/50">
          <div className="relative">
            <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-soft text-base" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${activeTab}...`}
              className="w-full bg-dark-100 border border-dark-200/50 text-offwhite rounded-xl
                pl-9 pr-3 py-2 text-sm
                placeholder:text-gray-soft/60
                focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30
                transition-all"
            />
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
        <div className="p-3 border-t border-dark-200/50">
          <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-dark-100/50 transition-colors group">
            <div className="relative">
              <img
                src={user?.avatar}
                alt={user?.fullName}
                className="w-11 h-11 rounded-full object-cover border-2 border-accent/30"
              />
              <div
                className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-dark ${
                  isConnected ? "bg-green-500" : "bg-gray-soft"
                }`}
              />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-offwhite truncate">
                {user?.fullName}
              </p>
              <p className="text-xs text-gray-soft truncate">
                @{user?.username}
              </p>
            </div>

            <div className="flex items-center gap-1">
              <button
                className="p-2 rounded-lg hover:bg-dark-200 text-gray-soft hover:text-accent transition-colors"
                onClick={() => setShowSettings(true)}
                title="Settings"
              >
                <HiOutlineCog className="text-lg" />
              </button>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="p-2 rounded-lg hover:bg-red-500/10 text-gray-soft hover:text-red-400 transition-colors"
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
        } flex-1 flex-col bg-dark relative overflow-hidden`}
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
            <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />

            <div className="text-center space-y-6 z-10 px-4">
              <div className="animate-float">
                <TalishLogo size="xl" />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl sm:text-3xl font-display font-bold text-offwhite">
                  Welcome to <TalishLogoText />
                </h2>
                <p className="text-gray-soft max-w-sm mx-auto">
                  Select a chat from the sidebar or click on a friend to start a
                  new conversation 💬
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 mt-8 max-w-md mx-auto">
                <div className="flex items-center gap-2 text-xs text-gray-soft px-3 py-1.5 bg-dark-50 rounded-full border border-dark-200/50">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  {isConnected ? "Connected" : "Connecting..."}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-soft px-3 py-1.5 bg-dark-50 rounded-full border border-dark-200/50">
                  <span className="w-2 h-2 bg-accent rounded-full" />
                  {chats.length} Chats
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-soft px-3 py-1.5 bg-dark-50 rounded-full border border-dark-200/50">
                  <span className="w-2 h-2 bg-accent-blue rounded-full" />
                  {friends.length} Friends
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Creating chat loader overlay */}
        {creatingChat && (
          <div className="absolute inset-0 bg-dark/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-3 border-accent border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-soft">Opening chat...</p>
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
    </div>
  );
};

export default ChatPage;
