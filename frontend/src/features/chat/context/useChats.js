/**
 * Access hook for the chat state.
 */

import { useContext } from "react";

import { ChatContext } from "./chatContext.js";

export const useChats = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChats must be used inside a <ChatProvider>.");
  }
  return context;
};

export default useChats;
