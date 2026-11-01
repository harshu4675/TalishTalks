import { useContext } from "react";
import { PWAContext } from "../context/pwaContext";
export const usePWA = () => {
  const value = useContext(PWAContext);
  if (!value) throw new Error("usePWA must be used inside PWAProvider");
  return value;
};
export default usePWA;
