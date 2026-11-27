/**
 * The friends context object.
 *
 * Kept in its own module so the provider file only exports components.
 */

import { createContext } from "react";

export const FriendsContext = createContext(null);

export default FriendsContext;
