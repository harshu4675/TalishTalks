// Keep logical dialog state separate from asynchronous browser history traversal.
const entries = [];
const historyIds = [];
let listening = false;
let travelling = false;
let scheduled = false;
const stateFor = (id) => ({ ...window.history.state, idx: (window.history.state?.idx || 0) + (id ? 1 : -1), key: id || window.history.state?.usr?.key || "root", talishOverlay: id || null });

const reconcile = () => {
  scheduled = false;
  if (travelling) return;
  if (entries.length > historyIds.length) {
    const entry = entries[historyIds.length];
    historyIds.push(entry.id);
    window.history.pushState(stateFor(entry.id), "");
  } else if (historyIds.length > entries.length) {
    travelling = true;
    window.history.back();
  } else if (entries.length && historyIds.at(-1) !== entries.at(-1).id) {
    // StrictMode or a same-tick dialog replacement reuses the existing entry.
    const id = entries.at(-1).id;
    historyIds[historyIds.length - 1] = id;
    window.history.replaceState({ ...window.history.state, key: id, talishOverlay: id }, "");
  }
};
const schedule = () => { if (!scheduled) { scheduled = true; queueMicrotask(reconcile); } };
const onPopState = (event) => {
  travelling = false;
  const target = event.state?.talishOverlay;
  const historyIndex = historyIds.indexOf(target);
  const committed = historyIds.splice(historyIndex >= 0 ? historyIndex + 1 : 0);
  if (historyIndex < 0 && target) { schedule(); return; }
  // A dialog opened while Back was in flight is not part of the old history stack.
  const closing = entries.filter((entry) => committed.includes(entry.id));
  closing.forEach((entry) => entries.splice(entries.indexOf(entry), 1));
  closing.reverse().forEach((entry) => entry.close());
  schedule();
};

export const pushOverlay = (close) => {
  if (!listening) { window.addEventListener("popstate", onPopState); listening = true; }
  const id = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
  const entry = { id, close };
  entries.push(entry);
  schedule();
  return () => {
    const index = entries.indexOf(entry);
    if (index < 0) return;
    entries.splice(index, 1);
    schedule();
  };
};
