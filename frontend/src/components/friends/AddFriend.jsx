import Avatar from "../../components/common/Avatar";
import React, { useState, useEffect } from "react";
import { HiOutlineSearch, HiOutlineUserAdd } from "react-icons/hi";
import toast from "react-hot-toast";
import Modal from "../common/Modal";
import { friendAPI, userAPI } from "../../services/api";
import { errorMessage } from "../../utils/messages";
const AddFriend = ({ isOpen, onClose, onRequestSent }) => {
  const [query, setQuery] = useState(""), [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false), [sending, setSending] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!isOpen) { setQuery(""); setResults([]); setError(""); return; }
    if (query.trim().length < 2) { setResults([]); setSearching(false); setError(""); return; }
    const controller = new AbortController();
    setSearching(true); setError("");
    const timer = setTimeout(async () => {
      try { const response = await userAPI.search(query.trim(), { signal: controller.signal }); setResults(response.data.users || []); }
      catch (failure) { if (failure.code !== "ERR_CANCELED") { setError(errorMessage(failure)); setResults([]); } }
      finally { if (!controller.signal.aborted) setSearching(false); }
    }, 350);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, isOpen]);
  const send = async (person) => {
    if (sending) return;
    setSending(person._id);
    try { const response = await friendAPI.sendRequest({ username: person.username }); toast.success(response.data.message); setResults((previous) => previous.filter((item) => item._id !== person._id)); onRequestSent?.(); }
    catch (failure) { toast.error(errorMessage(failure)); }
    finally { setSending(null); }
  };
  return <Modal isOpen={isOpen} onClose={onClose} title="Add a friend" description="Find people by name or username.">
    <div className="modal-body"><div className="search-field"><HiOutlineSearch /><input data-autofocus aria-label="Search people" placeholder="Name or @username" value={query} maxLength={100} onChange={(event) => setQuery(event.target.value)} /></div>
      <div className="mt-4" aria-live="polite">{query.trim().length < 2 ? <p className="muted text-sm py-5 text-center">Enter at least two characters to search.</p> : searching ? <div className="inline-loading"><span className="spinner" /> Searching…</div> : error ? <p className="form-error">{error}</p> : !results.length ? <div className="empty-state compact"><HiOutlineSearch /><h3>No people found</h3><p>Try a different name or an exact username.</p></div> : <div className="space-y-2">{results.map((person) => <div className="settings-row" key={person._id}><Avatar className="w-10 h-10 rounded-full object-cover" src={person.avatar} alt="" /><div><strong className="truncate block">{person.fullName}</strong><p>@{person.username}</p></div><button className="button primary" disabled={!!sending} onClick={() => send(person)}><HiOutlineUserAdd />{sending === person._id ? "Sending" : "Add"}</button></div>)}</div>}</div>
    </div>
  </Modal>;
};
export default AddFriend;
