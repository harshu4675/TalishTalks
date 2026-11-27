# Talish Talks frontend rewrite

A complete replacement of the Talish Talks frontend: a new design system, a new
application shell, and a new authentication implementation. The backend was not
modified - the client conforms to the existing REST and Socket.IO contract.

---

## What changed

### Authentication, rewritten

The previous implementation stored a token and a user object under ad-hoc
local-storage keys, refreshed the session with an unguarded `/auth/me` call,
and surfaced every failure through a single generic message. The replacement
is a deliberate pipeline:

| Module                          | Responsibility                                                    |
| ------------------------------- | ----------------------------------------------------------------- |
| `core/auth/session.js`          | Token and profile persistence, written and cleared atomically.     |
| `core/auth/validation.js`       | Client rules that mirror the server's express-validator chains.    |
| `core/auth/authService.js`      | Register, sign in, restore and sign out, with the storage effects. |
| `core/auth/AuthProvider.jsx`    | Session state machine: `initialising`, `authenticated`, `unauthenticated`. |
| `core/auth/useAuth.js`          | The access hook.                                                   |

Behaviour worth calling out:

- **Session restoration** validates the stored token against `/auth/me`. An
  invalid token clears the local session instead of leaving a signed-in shell
  around a dead session.
- **A 401 anywhere in the app** tears the session down exactly once, through a
  single `onUnauthorized` subscription in the transport.
- **Errors are typed.** `core/api/http.js` normalises transport failures,
  HTTP failures and application failures into one `ApiError` with `status`,
  `code` and per-field messages, so a form can show the server's own wording
  against the offending input.
- **Sign-out always clears locally**, even when the network call fails, so a
  user on a flaky connection is never stuck in a signed-in shell.
- **Client validation matches the server exactly**: full name 2-50 characters,
  username 3-20 letters/numbers/underscores, a valid email, and a password of
  6-72 characters containing at least one letter and one number. The password
  meter shows the server's requirements and rewards extra complexity on top.
- **Username availability** is checked against the server while typing.

### A new design system

The previous interface was a single hand-maintained stylesheet. The
replacement is a layered system:

- `styles/tokens.css` - colour, elevation, radius, spacing, typography and
  motion as CSS custom properties. The single place to re-theme.
- `styles/base.css` - resets, focus treatment, scrollbars, reduced-motion.
- `styles/components.css` - the primitive vocabulary: buttons, fields,
  checkboxes, avatars, cards, badges, tabs, modals, toasts, empty states,
  skeletons, spinners, menus and callouts.
- `styles/layout.css` - the application shell and its responsive behaviour.
- `styles/animations.css` - shared keyframes.

Tailwind was removed. The component library is hand-written CSS driven by the
tokens, which removes the utility-class indirection and keeps the visual
language consistent as the product grows.

### A new application shell

The old layout was a two-column sidebar. The new shell is three columns:

```
[ navigation rail ] [ conversation list ] [ open conversation ]
```

- The **rail** carries the brand mark, the primary destinations with live
  badges, and the signed-in user's identity.
- The **conversation column** carries the search field, filter chips, the
  conversation list and the new-conversation action.
- The **conversation panel** carries the participant header, the message
  history and the composer.

On viewports narrower than 860px the rail is replaced by a compact top bar and
the open conversation slides over the conversation list, with a back control
in the header. The standalone pages (contacts, profile, settings) sit beside
the rail so navigation never breaks.

### New pages and components

| Screen            | What it does                                                              |
| ----------------- | ------------------------------------------------------------------------- |
| Sign in / Sign up | Combined canvas, client validation, strength meter, username availability. |
| Chats             | The messaging shell described above.                                       |
| Contacts          | Friends, incoming and outgoing requests, and a people directory search.   |
| Profile           | View and edit your profile, change your photo, sign out.                   |
| Settings          | Push notifications, blocked people, connection status, device session.     |
| Not found         | A friendly 404 for unknown routes.                                         |

New shared primitives include a viewport-aware floating `Menu` (it flips above
its trigger and clamps to the viewport, so it can never open off-screen), a
`ConfirmDialog`, a toast provider, an error boundary and a set of custom icons
that are not part of the Feather set.

### Messaging

`features/chat/context/ChatProvider.jsx` owns the conversation list and the
message history:

- **Optimistic sends** with a durable client ID. The server deduplicates on
  that ID, so a retried send cannot create a duplicate.
- **Realtime reconciliation** by database ID and client ID, so the HTTP
  response, the socket event and a later history load converge on one message.
- **Read receipts** update through the `messages_seen` event.
- **Typing hints**, **unread counters**, **chat summaries** and **deletion
  events** are all handled in one place.
- **Chat flags** - pin, mute, mark as unread, disappearing messages, clear and
  remove - are exposed as actions and reflected immediately.

### Structure

The source tree is organised by responsibility:

```
src/
  app/            Shell, providers, routing, route guards, page layout
  core/           api/ auth/ realtime/ hooks/ utils/ config.js
  shared/         Reusable presentation components
  features/       auth/ chat/ friends/ profile/ settings/ pwa/
  styles/         The design system
```

`core/api/endpoints.js` is the only module that knows a backend path, and
`core/realtime/RealtimeProvider.jsx` is the only module that knows a socket
event name. Both are designed to be extended in one place.

---

## Configuration

`frontend/.env.example` was rewritten as a documented template. Every variable
is optional and the file states the default that applies when it is absent:

| Variable                        | Default        | Purpose                                    |
| ------------------------------- | -------------- | ------------------------------------------ |
| `VITE_API_URL`                  | `/api`         | Base path for REST calls.                  |
| `VITE_SOCKET_URL`               | *(empty)*      | Origin for the Socket.IO connection.       |
| `VITE_APP_NAME`                 | `Talish Talks` | Product name in the interface.             |
| `VITE_MAX_MESSAGE_LENGTH`       | `5000`         | Composer limit; must match the server.     |
| `VITE_SEARCH_DEBOUNCE_MS`       | `300`          | Delay before a typed search is sent.       |
| `VITE_ENABLE_PUSH_NOTIFICATIONS` | `true`        | Show the push toggle in Settings.          |
| `VITE_ENABLE_OFFLINE_MODE`      | `true`         | Register the service worker.               |

`VITE_API_URL` and `VITE_SOCKET_URL` are validated when the dev server or the
production build starts, so a malformed value fails with an actionable message
instead of surfacing later as a generic network error.

---

## Verification

| Check                            | Result                                        |
| -------------------------------- | --------------------------------------------- |
| `npm run lint`                   | Passed, no errors or warnings                  |
| `npm run build`                  | Passed, production PWA build with the worker   |
| Playwright browser suite         | **17/17 passed**                               |
| Backend integration suite        | **17/17 passed** (unchanged)                   |
| Production PWA smoke             | **Passed** - worker registers and controls the page, the manifest and icons resolve, and an offline navigation to `/settings` is served from the precached shell |
| Netlify deploy preview          | **Passed** - the build deploys, the manifest resolves, and the SPA fallback serves `/contacts` and `/chat/:chatId` with the application shell |

The browser suite drives two real browsers against a real backend:

**Authentication** - registration through the interface, client-side validation
before any request, sign in with a username and with an email, session
restoration across a reload, rejection of a wrong password and of an unknown
account, protected-route redirects, sign-out, and navigation between the two
auth screens.

**Messaging** - live two-user delivery, the conversation preview updating on
both sides, read receipts, editing a message, replying with a quoted
original, typing hints appearing and clearing, an unread counter on a
conversation that is not open, opening a conversation from the contacts page,
and the layout adapting to a 390x844 viewport without horizontal overflow.

The backend integration suite was re-run to confirm the client changes did not
affect the server contract.

### Offline behaviour

The production service worker precaches the application shell (11 assets,
~423 KiB) and serves navigations from the network when possible. When the
device is offline, a navigation falls back to the precached `index.html`, so
deep links such as `/settings` open the app instead of the browser's error
page. `/api/*` and `/socket.io/*` are never cached, so authentication and
messaging always talk to the live server.

The offline smoke test covers the production build (`npm run preview`), not
the development server, because the worker is only registered in a production
build.

### Deployment

`frontend/public/_redirects` is copied into the publish directory and gives
the host the SPA fallback for the client's own routes (`/signin`,
`/register`, `/chat/*`, `/contacts`, `/profile`, `/settings`, `/404`). The
live paths (`/api/*`, `/socket.io/*`) are deliberately excluded, because a
blanket `/*` rule would shadow the proxy that forwards them to the backend and
break authentication and messaging.

The rewrite also changes the sign-in path from `/auth` to `/signin`, with
`/register` for the sign-up screen.

---

## Notes and limits

- The backend was not modified. The client matches the existing contract,
  including the details that differ from a naive reading of the routes: a
  friend request is addressed by `username` (not `receiverId`), a friend
  response uses `action: "accept" | "reject"` (not `accept`), and a push
  subscription is wrapped in a `subscription` property.
- Push notifications require VAPID keys on the backend. When they are absent
  the Settings screen says so instead of failing silently.
- Avatar and media uploads require a configured Cloudinary account.
- Browser coverage is Chromium. Physical-device keyboard and installed-PWA
  behaviour still need device QA.
- The backend applies a global rate limit of 600 requests per 15 minutes per
  address. Repeated browser-suite runs can reach it; the suite reports this
  explicitly and the backend must be restarted (which resets the window)
  before running again.
