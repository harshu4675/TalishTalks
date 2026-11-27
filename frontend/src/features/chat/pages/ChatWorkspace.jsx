/**
 * ChatWorkspace - the three-column messaging shell.
 *
 * Layout:
 *   [ rail ] [ conversation list ] [ open conversation ]
 *
 * On narrow viewports the conversation column and the open conversation take
 * turns: the open conversation slides over the list and the back button
 * returns to it.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { useIsCompact } from "../../../core/hooks/useMediaQuery.js";
import { useChats } from "../context/useChats.js";
import AppRail from "../components/AppRail.jsx";
import ChatPanel from "../components/ChatPanel.jsx";
import ConversationColumn from "../components/ConversationColumn.jsx";
import NewChatDialog from "../components/NewChatDialog.jsx";

/**
 * The primary screen of the application.
 */
export default function ChatWorkspace() {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const compact = useIsCompact();

  const { chats, openChat, closeChat } = useChats();
  const [newChatOpen, setNewChatOpen] = useState(false);

  const activeChat = useMemo(
    () => chats.find((chat) => chat._id === chatId) || null,
    [chats, chatId],
  );

  /* Load the conversation whenever the route changes. */
  useEffect(() => {
    if (!chatId) {
      closeChat();
      return undefined;
    }
    openChat(chatId);
    return () => closeChat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId]);

  const handleSelectChat = useCallback(
    (nextId) => {
      navigate(`/chat/${nextId}`);
    },
    [navigate],
  );

  const handleBack = useCallback(() => {
    navigate("/");
  }, [navigate]);

  /* On a narrow viewport the open conversation covers the conversation list. */
  const panelOpen = compact ? Boolean(chatId) : true;

  return (
    <div className="app-shell">
      <AppRail onOpenProfile={() => navigate("/profile")} />

      <ConversationColumn
        activeChatId={chatId || null}
        onSelectChat={handleSelectChat}
        onNewChat={() => setNewChatOpen(true)}
      />

      <div style={{ display: "contents" }}>
        <ChatPanel
          chat={activeChat}
          compact={compact}
          mobileOpen={panelOpen}
          onBack={handleBack}
          onChatClosed={() => navigate("/")}
        />
      </div>

      <NewChatDialog
        open={newChatOpen}
        onClose={() => setNewChatOpen(false)}
        onCreated={(chat) => handleSelectChat(chat._id)}
      />
    </div>
  );
}
