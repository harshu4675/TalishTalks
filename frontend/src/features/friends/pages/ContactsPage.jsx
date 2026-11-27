/**
 * ContactsPage - friends, requests and the people directory.
 *
 * The page is organised around three tabs so the same navigation chrome
 * serves every social need.
 */

import { useEffect, useState } from "react";
import {
  FiCheck,
  FiMessageCircle,
  FiSearch,
  FiTrash2,
  FiUserPlus,
  FiUsers,
  FiX,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";

import AppLayout from "../../../app/AppLayout.jsx";

import { useChats } from "../../chat/context/useChats.js";
import { useFriends } from "../context/useFriends.js";
import { useDebouncedValue } from "../../../core/hooks/useDebouncedValue.js";
import Avatar from "../../../shared/components/Avatar.jsx";
import Button from "../../../shared/components/Button.jsx";
import { EmptyState, Skeleton } from "../../../shared/components/Feedback.jsx";
import { Input } from "../../../shared/components/Field.jsx";
import { useToast } from "../../../shared/components/useToast.js";

const TABS = [
  { id: "friends", label: "Friends" },
  { id: "requests", label: "Requests" },
  { id: "discover", label: "Discover" },
];

/**
 * The contacts screen.
 */
export default function ContactsPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const {
    friends,
    requests,
    directory,
    isLoading,
    error: contactsError,
    refresh: refreshContacts,
    isSearching,
    pendingCount,
    sendRequest,
    respondToRequest,
    cancelRequest,
    removeFriend,
    searchUsers,
    relationshipWith,
  } = useFriends();
  const { startChatWith } = useChats();

  const [tab, setTab] = useState("friends");
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState(null);
  const debouncedQuery = useDebouncedValue(query.trim(), 350);

  /* Run the directory search as the user types. */
  useEffect(() => {
    if (tab !== "discover") return;
    searchUsers(debouncedQuery);
  }, [tab, debouncedQuery, searchUsers]);

  const run = async (key, action) => {
    setBusyId(key);
    try {
      await action();
    } catch (error) {
      toast.error("That did not work", error.message);
    } finally {
      setBusyId(null);
    }
  };

  const openChat = async (friendId) => {
    await run(friendId, async () => {
      const chat = await startChatWith(friendId);
      navigate(`/chat/${chat._id}`);
    });
  };

  return (
    <AppLayout
      eyebrow="Community"
      title="Contacts"
      subtitle="Manage the people you talk to, handle incoming requests and discover new people by name or username."
    >
      <>
        {contactsError ? <div className="callout callout--warning" role="alert"><span>{contactsError}</span><Button variant="secondary" size="sm" onClick={refreshContacts}>Retry</Button></div> : null}
        <div className="tabs" role="tablist" aria-label="Contact sections" style={{ maxWidth: 460 }}>
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              className={`tabs__item ${tab === item.id ? "tabs__item--active" : ""}`.trim()}
              onClick={() => setTab(item.id)}
              data-testid={`contacts-tab-${item.id}`}
            >
              {item.label}
              {item.id === "requests" && pendingCount > 0 ? (
                <span className="badge badge--count">{pendingCount}</span>
              ) : null}
            </button>
          ))}
        </div>

        <section className="section">
          {tab === "friends" ? (
            <div className="card">
              <div className="card__header">
                <h2 className="card__title">Your friends</h2>
                <span className="badge badge--brand">{friends.length}</span>
              </div>

              {isLoading ? (
                <div className="card__body" style={{ display: "grid", gap: "var(--space-4)" }}>
                  {[0, 1, 2].map((index) => (
                    <div key={index} style={{ display: "flex", gap: "var(--space-3)" }}>
                      <Skeleton width={48} height={48} circle />
                      <div style={{ flex: 1, display: "grid", gap: 8, paddingTop: 6 }}>
                        <Skeleton width="35%" height={12} />
                        <Skeleton width="55%" height={10} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : friends.length === 0 ? (
                <EmptyState
                  icon={<FiUsers size={26} />}
                  title="No friends yet"
                  message="Search the directory to find people and send a friend request."
                  action={
                    <Button variant="soft" size="sm" onClick={() => setTab("discover")}>
                      Find people
                    </Button>
                  }
                />
              ) : (
                <ul>
                  {friends.map((friend) => (
                    <li
                      key={friend._id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "var(--space-3)",
                        padding: "var(--space-3) var(--space-5)",
                        borderTop: "1px solid var(--border-subtle)",
                      }}
                    >
                      <Avatar
                        src={friend.avatar}
                        name={friend.fullName}
                        size="lg"
                        online={friend.isOnline}
                        offline={!friend.isOnline}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontWeight: "var(--weight-semibold)" }}>{friend.fullName}</p>
                        <p style={{ color: "var(--text-tertiary)", fontSize: "var(--text-sm)" }}>
                          @{friend.username}
                        </p>
                      </div>
                      <Button
                        variant="soft"
                        size="sm"
                        onClick={() => openChat(friend._id)}
                        disabled={busyId === friend._id}
                      >
                        <FiMessageCircle size={15} /> Message
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        iconOnly
                        aria-label={`Remove ${friend.fullName}`}
                        onClick={() =>
                          run(friend._id, () => removeFriend(friend._id))
                        }
                      >
                        <FiTrash2 size={15} />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}

          {tab === "requests" ? (
            <div style={{ display: "grid", gap: "var(--space-5)" }}>
              <div className="card">
                <div className="card__header">
                  <h2 className="card__title">Incoming</h2>
                  <span className="badge badge--brand">{requests.received.length}</span>
                </div>
                {requests.received.length === 0 ? (
                  <EmptyState icon={<FiUserPlus size={26} />} title="No pending requests" />
                ) : (
                  <ul>
                    {requests.received.map((request) => (
                      <li
                        key={request._id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "var(--space-3)",
                          padding: "var(--space-3) var(--space-5)",
                          borderTop: "1px solid var(--border-subtle)",
                        }}
                      >
                        <Avatar
                          src={request.sender?.avatar}
                          name={request.sender?.fullName}
                          size="lg"
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontWeight: "var(--weight-semibold)" }}>
                            {request.sender?.fullName}
                          </p>
                          <p style={{ color: "var(--text-tertiary)", fontSize: "var(--text-sm)" }}>
                            @{request.sender?.username}
                          </p>
                        </div>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() =>
                            run(request._id, () => respondToRequest(request._id, true))
                          }
                          disabled={busyId === request._id}
                        >
                          <FiCheck size={15} /> Accept
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() =>
                            run(request._id, () => respondToRequest(request._id, false))
                          }
                          disabled={busyId === request._id}
                        >
                          <FiX size={15} /> Decline
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="card">
                <div className="card__header">
                  <h2 className="card__title">Sent</h2>
                  <span className="badge">{requests.sent.length}</span>
                </div>
                {requests.sent.length === 0 ? (
                  <EmptyState icon={<FiUserPlus size={26} />} title="No outgoing requests" />
                ) : (
                  <ul>
                    {requests.sent.map((request) => (
                      <li
                        key={request._id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "var(--space-3)",
                          padding: "var(--space-3) var(--space-5)",
                          borderTop: "1px solid var(--border-subtle)",
                        }}
                      >
                        <Avatar
                          src={request.receiver?.avatar}
                          name={request.receiver?.fullName}
                          size="lg"
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontWeight: "var(--weight-semibold)" }}>
                            {request.receiver?.fullName}
                          </p>
                          <p style={{ color: "var(--text-tertiary)", fontSize: "var(--text-sm)" }}>
                            @{request.receiver?.username} · awaiting a reply
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => run(request._id, () => cancelRequest(request._id))}
                          disabled={busyId === request._id}
                        >
                          Cancel
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ) : null}

          {tab === "discover" ? (
            <div className="card">
              <div className="card__body" style={{ display: "grid", gap: "var(--space-4)" }}>
                <Input
                  type="search"
                  placeholder="Search by name or username"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  icon={<FiSearch size={16} />}
                  aria-label="Search people"
                  autoFocus
                  data-testid="people-search"
                />

                {query.trim().length < 2 ? (
                  <EmptyState
                    icon={<FiSearch size={26} />}
                    title="Find people"
                    message="Type at least two characters to search for someone on Talish Talks."
                  />
                ) : isSearching ? (
                  <div style={{ display: "grid", gap: "var(--space-4)" }}>
                    {[0, 1, 2].map((index) => (
                      <div key={index} style={{ display: "flex", gap: "var(--space-3)" }}>
                        <Skeleton width={48} height={48} circle />
                        <div style={{ flex: 1, display: "grid", gap: 8, paddingTop: 6 }}>
                          <Skeleton width="35%" height={12} />
                          <Skeleton width="55%" height={10} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : directory.length === 0 ? (
                  <EmptyState
                    icon={<FiSearch size={26} />}
                    title="No people found"
                    message="Nobody matches that search. Try a different name."
                  />
                ) : (
                  <ul style={{ display: "grid", gap: "var(--space-2)" }}>
                    {directory.map((person) => {
                      const relationship = relationshipWith(person._id);
                      return (
                        <li
                          key={person._id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "var(--space-3)",
                            padding: "var(--space-2) 0",
                          }}
                        >
                          <Avatar
                            src={person.avatar}
                            name={person.fullName}
                            size="lg"
                            online={person.isOnline}
                            offline={!person.isOnline}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontWeight: "var(--weight-semibold)" }}>{person.fullName}</p>
                            <p style={{ color: "var(--text-tertiary)", fontSize: "var(--text-sm)" }}>
                              @{person.username}
                            </p>
                          </div>

                          {relationship === "friend" ? (
                            <Button
                              variant="soft"
                              size="sm"
                              onClick={() => openChat(person._id)}
                              disabled={busyId === person._id}
                            >
                              <FiMessageCircle size={15} /> Message
                            </Button>
                          ) : relationship === "outgoing" ? (
                            <span className="badge badge--brand">Request sent</span>
                          ) : relationship === "incoming" ? (
                            <span className="badge badge--warning">Wants to connect</span>
                          ) : (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => run(person._id, () => sendRequest(person.username))}
                              disabled={busyId === person._id}
                            >
                              <FiUserPlus size={15} /> Add
                            </Button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          ) : null}
        </section>
      </>
    </AppLayout>
  );
}
