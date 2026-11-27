/**
 * The toast context object.
 *
 * Kept in its own module so the provider file only exports components.
 */

import { createContext } from "react";

export const ToastContext = createContext(null);

export default ToastContext;
