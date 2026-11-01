import Avatar from "../components/common/Avatar";
import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { HiOutlineSearch, HiOutlineUserAdd, HiOutlineCog, HiOutlineBell, HiOutlineChatAlt2, HiOutlineUsers, HiOutlineShare, HiOutlineX, HiOutlineLogout, HiOutlineLockClosed, HiOutlineRefresh } from "react-icons/hi";
import toast from "react-hot-toast";
import TalishLogo from "../assets/logo";
import { useAuth } from "../hooks/useAuth";
import { useSocket } from "../hooks/useSocket";
import { useFriends } from "../hooks/useFriends";
import { useChat } from "../hooks/useChat";
import FriendList from "../components/friends/FriendList";
import AddFriend from "../components/friends/AddFriend";
import FriendRequests from "../components/friends/FriendRequests";
import ChatList from "../components/chat/ChatList";
import ChatWindow from "../components/chat/ChatWindow";
import PinModal from "../components/chat/PinModal";
import { chatAPI } from "../services/api";
import { errorMessage } from "../utils/messages";
import ProfileSettings from "../components/profile/ProfileSettings";
import InviteFriend from "../components/friends/InviteFriend";

const ChatPage = () => {
  const { user, logout } = useAuth();
  const { isConnected } = useSocket();
  const { chatId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [routeError, setRouteError] = useState("");
  const { friends, loadingFriends, pendingRequestsCount, fetchFriends, fetchPendingCount } = useFriends();
  const { chats, fetchChats, loadingChats, chatError, activeChat, selectChat, closeChat, lockAllAgain, markChatsUnlocked, unlockedChats } = useChat();
  const [modal, setModal] = useState(null);
  const [activeTab, setActiveTab] = useState("chats");
  const [searchQuery, setSearchQuery] = useState("");
  const [creatingChat, setCreatingChat] = useState(false);
  const [revealLocked, setRevealLocked] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const routeRequest = useRef(null);
  const lockedCount = chats.filter((chat) => chat.isLocked).length;
  const openChat = (chat) => { selectChat(chat); navigate(`/chat/${chat._id}`, { state: { fromList: true } }); };
  const backToList = () => { closeChat(); if (location.state?.fromList && window.history.state?.idx > 0) navigate(-1); else navigate("/", { replace: true }); };

  useEffect(() => {
    const onVisibility = () => { if (document.hidden) { lockAllAgain(); setRevealLocked(false); } };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [lockAllAgain]);
  useEffect(() => {
    if (!chatId || loadingChats) return;
    const chat = chats.find((item) => item._id === chatId);
    if (chat) {
      if (chat.isLocked && !unlockedChats.has(chatId)) { closeChat(); navigate("/", { replace: true }); toast("Unlock this conversation from the chat list."); }
      else selectChat(chat);
    } else if (!chatError) {
      // A new conversation can arrive after the list request; refresh once for deep links.
      if (routeRequest.current !== chatId) {
        routeRequest.current = chatId;
        void fetchChats().then((loaded) => {
          if (routeRequest.current === chatId && Array.isArray(loaded) && !loaded.some((item) => item._id === chatId)) setRouteError("This conversation is unavailable or was removed from your list.");
        });
      }
    }
  }, [chatId, chats, loadingChats, chatError, unlockedChats, selectChat, closeChat, navigate, fetchChats]);
  useEffect(() => { if (!chatId && activeChat) closeChat(); }, [chatId, activeChat, closeChat]);
  useEffect(() => { if (!chatId) { routeRequest.current = null; setRouteError(""); } }, [chatId]);

  const handleLogout = async () => { setLoggingOut(true); await logout(); setLoggingOut(false); toast.success("Logged out"); };
  const handleFriendClick = async (friend) => {
    if (creatingChat) return;
    setCreatingChat(true);
    try {
      const response = await chatAPI.create({ friendId: friend._id });
      await fetchChats(); setActiveTab("chats"); openChat(response.data.chat);
    } catch (error) { toast.error(errorMessage(error, "Failed to open chat")); }
    finally { setCreatingChat(false); }
  };
  const reveal = async (pin) => {
    const chat = chats.find((item) => item.isLocked);
    if (!chat) return;
    try { await chatAPI.unlock(chat._id, pin); markChatsUnlocked(); setRevealLocked(true); setSearchQuery(""); setModal(null); }
    catch (error) { toast.error(errorMessage(error, "Incorrect PIN")); }
  };
  const hideLocked = () => { setRevealLocked(false); lockAllAgain(); };
  const filteredChats = useMemo(() => chats.filter((chat) => (revealLocked || !chat.isLocked) && `${chat.otherUser?.fullName} ${chat.otherUser?.username}`.toLowerCase().includes(searchQuery.toLowerCase())), [chats, searchQuery, revealLocked]);
  const lockedFriendIds = new Set(chats.filter((chat) => chat.isLocked && !revealLocked).map((chat) => chat.otherUser?._id));
  const filteredFriends = friends.filter((friend) => !lockedFriendIds.has(friend._id) && `${friend.fullName} ${friend.username}`.toLowerCase().includes(searchQuery.toLowerCase()));
  const unread = chats.filter((chat) => !chat.isLocked || revealLocked).reduce((sum, chat) => sum + (chat.unreadCount || 0), 0);

  return <div className="messenger-shell">
    <aside className={`sidebar ${activeChat ? "has-active-chat" : ""}`}>
      <header className="sidebar-brand"><TalishLogo size="sm" /><div className="flex gap-1">
        <button className="icon-button" onClick={() => setModal("requests")} aria-label={`Friend requests${pendingRequestsCount ? `, ${pendingRequestsCount} pending` : ""}`}><HiOutlineBell />{pendingRequestsCount > 0 && <span className="notification-dot">{pendingRequestsCount > 9 ? "9+" : pendingRequestsCount}</span>}</button>
        <button className="icon-button" onClick={() => setModal("add")} aria-label="Add friend"><HiOutlineUserAdd /></button>
        <button className="icon-button" onClick={() => setModal("invite")} aria-label="Invite a friend"><HiOutlineShare /></button>
      </div></header>
      <div className="sidebar-title"><h1>{activeTab === "chats" ? "Chats" : "Friends"}</h1><span className={`connection-label ${isConnected ? "online" : ""}`}><i />{isConnected ? "Connected" : "Reconnecting…"}</span></div>
      <nav className="sidebar-tabs" aria-label="Conversation views">
        <button className={activeTab === "chats" ? "active" : ""} onClick={() => setActiveTab("chats")}><HiOutlineChatAlt2 /> Chats {unread > 0 && <span className="count-badge">{unread}</span>}</button>
        <button className={activeTab === "friends" ? "active" : ""} onClick={() => { setActiveTab("friends"); hideLocked(); }}><HiOutlineUsers /> Friends</button>
      </nav>
      <div className="sidebar-search"><div className="search-field"><HiOutlineSearch /><input aria-label={`Search ${activeTab}`} placeholder={`Search ${activeTab}`} value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} />{searchQuery && <button className="icon-button small" onClick={() => setSearchQuery("")} aria-label="Clear search"><HiOutlineX /></button>}</div>
        {lockedCount > 0 && <button className="locked-chats-button" onClick={() => revealLocked ? hideLocked() : setModal("unlock")}><HiOutlineLockClosed />{revealLocked ? "Hide locked chats" : `Locked chats (${lockedCount})`}</button>}
      </div>
      <div className="sidebar-list">
        {chatError && <div className="inline-error"><p>{chatError}</p><button className="text-button" onClick={fetchChats}><HiOutlineRefresh /> Retry</button></div>}
        {activeTab === "chats" ? <ChatList chats={filteredChats} loading={loadingChats && !chats.length} activeChatId={activeChat?._id} onChatSelect={openChat} /> : <FriendList friends={filteredFriends} loading={loadingFriends} activeFriendId={activeChat?.otherUser?._id} onFriendSelect={handleFriendClick} onFriendRemoved={() => { void fetchFriends(); void fetchChats(); }} />}
        {creatingChat && <div className="inline-loading" role="status"><span className="spinner" /> Opening conversation…</div>}
      </div>
      <footer className="sidebar-profile"><Avatar src={user?.avatar} alt="" /><div className="min-w-0 flex-1"><strong className="block truncate">{user?.fullName}</strong><span className="muted text-xs truncate block">@{user?.username}</span></div>
        <button className="icon-button" onClick={() => setModal("settings")} aria-label="Settings"><HiOutlineCog /></button>
        <button className="icon-button" onClick={handleLogout} disabled={loggingOut} aria-label="Log out"><HiOutlineLogout /></button>
      </footer>
    </aside>
    <main className={`conversation-main ${activeChat || routeError ? "is-open" : ""}`}>
      {routeError && !activeChat ? <div className="empty-state h-full"><HiOutlineChatAlt2 /><h2>Conversation unavailable</h2><p>{chatError || routeError}</p><button className="button secondary" onClick={() => { routeRequest.current = null; setRouteError(""); void fetchChats(); }}>Try again</button><button className="text-button" onClick={backToList}>Back to chats</button></div> : activeChat ? <ChatWindow key={activeChat._id} chat={activeChat} onBack={backToList} /> : <div className="welcome-panel"><div className="welcome-icon"><HiOutlineChatAlt2 /></div><h2>Your conversations, all here.</h2><p>Select a chat or choose a friend to start a conversation.</p><button className="button secondary" onClick={() => { setActiveTab("friends"); setModal("add"); }}><HiOutlineUserAdd /> Find a friend</button><span className="welcome-connection">{isConnected ? "Messages sync in real time" : "Reconnecting to messages…"}</span></div>}
    </main>
    <AddFriend isOpen={modal === "add"} onClose={() => setModal(null)} onRequestSent={fetchPendingCount} />
    <FriendRequests isOpen={modal === "requests"} onClose={() => setModal(null)} onRequestHandled={() => { void fetchFriends(); void fetchPendingCount(); }} />
    <ProfileSettings isOpen={modal === "settings"} onClose={() => setModal(null)} />
    <InviteFriend isOpen={modal === "invite"} onClose={() => setModal(null)} />
    <PinModal isOpen={modal === "unlock"} mode="verify" title="Unlock your chats" subtitle="Enter your chat lock PIN to reveal hidden conversations." onSubmit={reveal} onClose={() => setModal(null)} />
  </div>;
};
export default ChatPage;
