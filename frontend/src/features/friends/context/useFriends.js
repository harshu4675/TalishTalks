/**
 * Access hook for the friends state.
 */

import { useContext } from "react";

import { FriendsContext } from "./friendsContext.js";

export const useFriends = () => {
  const context = useContext(FriendsContext);
  if (!context) {
    throw new Error("useFriends must be used inside a <FriendsProvider>.");
  }
  return context;
};

export default useFriends;
