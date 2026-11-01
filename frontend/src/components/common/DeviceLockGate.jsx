import React, { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { deviceLockEnabled } from "../../utils/deviceLock";
import SiteLock from "./SiteLock";
import LoadingScreen from "./LoadingScreen";
const DeviceLockGate = ({ children }) => {
  const { loading, checkAuth } = useAuth();
  const [unlocked, setUnlocked] = useState(false);
  if (loading) return <LoadingScreen />;
  if (deviceLockEnabled() && !unlocked) return <SiteLock onUnlock={async () => { await checkAuth(); setUnlocked(true); }} />;
  return children;
};
export default DeviceLockGate;
