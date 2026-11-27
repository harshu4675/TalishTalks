/**
 * ServiceWorkerManager - registers the service worker and reacts to updates.
 *
 * The worker is registered lazily (after the page has loaded) so it never
 * competes with the first paint, and API and Socket.IO traffic is explicitly
 * excluded from caching so a stale response can never break the chat.
 */

import { useEffect, useState } from "react";

import config from "../../../core/config.js";
import Button from "../../../shared/components/Button.jsx";
import { useToast } from "../../../shared/components/useToast.js";

/**
 * Registers the worker and surfaces a prompt when a new version is ready.
 */
export default function ServiceWorkerManager() {
  const toast = useToast();
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    if (!config.offlineEnabled) return undefined;
    if (import.meta.env.DEV) return undefined;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return undefined;

    let registration;
    let cancelled = false;

    const register = async () => {
      try {
        registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        if (cancelled) return;

        registration.addEventListener("updatefound", () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            if (installing.state === "installed" && navigator.serviceWorker.controller) {
              setUpdateReady(true);
            }
          });
        });
      } catch {
        /* the app works fine without a service worker */
      }
    };

    if (document.readyState === "complete") register();
    else window.addEventListener("load", register);

    return () => {
      cancelled = true;
      window.removeEventListener("load", register);
    };
  }, []);

  useEffect(() => {
    if (!updateReady) return undefined;
    toast.info(
      "Update available",
      "A new version of Talish Talks is ready. Reload to apply it.",
    );
  }, [updateReady, toast]);

  if (!updateReady) return null;

  return (
    <div
      style={{
        position: "fixed",
        zIndex: 300,
        left: "50%",
        transform: "translateX(-50%)",
        bottom: "calc(var(--space-6) + var(--safe-bottom))",
        display: "flex",
        alignItems: "center",
        gap: "var(--space-3)",
        padding: "var(--space-3) var(--space-4)",
        background: "var(--surface-inverse)",
        color: "var(--text-inverse)",
        borderRadius: "var(--radius-md)",
        boxShadow: "var(--shadow-lg)",
      }}
    >
      <span style={{ fontSize: "var(--text-sm)" }}>A new version is ready.</span>
      <Button size="sm" onClick={() => window.location.reload()}>
        Reload
      </Button>
    </div>
  );
}
