/**
 * The chat context object.
 *
 * Kept in its own module so that the provider file only exports components
 * (which keeps React Fast Refresh working) and so that the context can be
 * imported without pulling in the provider implementation.
 */

import { createContext } from "react";

export const ChatContext = createContext(null);

export default ChatContext;
