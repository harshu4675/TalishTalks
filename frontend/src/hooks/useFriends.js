import { useContext } from "react";
import { FriendsContext } from "../context/FriendsContext";

export const useFriends = () => {
  const context = useContext(FriendsContext);

  if (!context) {
    throw new Error("useFriends must be used within a FriendsProvider");
  }

  return context;
};

export default useFriends;
