# Talish Talks frontend

A React + Vite client for the Talish Talks Express/Socket.IO API.

The interface is a three-column messaging shell (navigation rail, conversation
list, open conversation) with a full design system built on CSS custom
properties. It talks to the existing backend over REST and Socket.IO - no
backend changes are required.

---

## Quick start

```sh
npm ci
cp .env.example .env      # then edit the values
npm run dev
```

The development server listens on `0.0.0.0:3000` and proxies both `/api` and
`/socket.io` to the backend on port `5000`. Leaving `VITE_API_URL` empty is
therefore the simplest setup; the browser calls `/api/...` and Vite forwards
the request.

| Script              | What it does                                              |
| ------------------- | --------------------------------------------------------- |
| `npm run dev`       | Starts the Vite dev server with the API/socket proxy.      |
| `npm run build`     | Production build (includes the service worker).            |
| `npm run preview`   | Serves the production build on port 3000.                  |
| `npm run lint`      | ESLint over `src` and `tests`.                             |
| `npm test`          | Playwright browser suite (see below).                      |

### Deployment

The publish directory is `frontend/dist` and the build command is
`cd frontend && npm ci && npm run build`.

`frontend/public/_redirects` is copied into the publish directory and gives the
host the SPA fallback: a direct request for `/signin`, `/register`, `/chat/*`,
`/contacts`, `/profile`, `/settings` or `/404` is answered with
`index.html` so the router can take over. Only the application's own routes
are listed - `/api/*` and `/socket.io/*` are left alone on purpose, because a
blanket `/*` rule would shadow the proxy that forwards live traffic to the
backend and break authentication and messaging.

Set `VITE_API_URL` to the absolute URL of the deployed backend (it must end in
`/api`) and `VITE_SOCKET_URL` to the backend origin, unless both the frontend
and the backend are served from the same origin.

---

## Environment

Every variable is optional - the defaults shown in `.env.example` are what the
application uses when a variable is absent. Copy the file and replace the
placeholders with your own values.

| Variable                       | Default        | Purpose                                                        |
| ------------------------------ | -------------- | -------------------------------------------------------------- |
| `VITE_API_URL`                 | `/api`         | Base path for REST calls. Absolute or root-relative.           |
| `VITE_SOCKET_URL`              | *(empty)*      | Origin for the Socket.IO connection. Empty reuses the API host. |
| `VITE_APP_NAME`                | `Talish Talks` | Product name used in the interface.                             |
| `VITE_MAX_MESSAGE_LENGTH`      | `5000`         | Composer limit. Must match the server limit.                   |
| `VITE_SEARCH_DEBOUNCE_MS`      | `300`          | Delay before a typed search is sent.                           |
| `VITE_ENABLE_PUSH_NOTIFICATIONS` | `true`        | Show the push-notification toggle in Settings.                 |
| `VITE_ENABLE_OFFLINE_MODE`     | `true`         | Register the service worker.                                   |

`VITE_API_URL` is validated when the dev server or the production build
starts. A malformed value (`http:/localhost:5000/api`) fails immediately with
an actionable message instead of silently breaking every request:

```
Invalid VITE_API_URL "http:/localhost:5000/api": it must start with "http://" or "https://"
```

Only `VITE_`-prefixed variables reach the browser bundle. Never put a secret
here.

---

## Architecture

The source tree is organised by responsibility so that a new feature has an
obvious place to live.

```
src/
  app/            Application shell: providers, routing, route guards, layout
  core/           Framework-free infrastructure
    api/            HTTP transport (http.js) and the endpoint map (endpoints.js)
    auth/           Session storage, validation, service, provider, hook
    realtime/       Socket.IO client and the realtime provider
    hooks/          useAsync, useDebouncedValue, useMediaQuery, useOnClickOutside
    utils/          date, text, error and id helpers
    config.js       Every environment-dependent value, resolved once
  shared/         Reusable presentation components (Button, Field, Modal, Menu...)
  features/       Vertical slices, each with its own components, pages and state
    auth/           Sign in and sign up
    chat/           The messaging shell, conversation list and message thread
    friends/        Contacts, friend requests and the people directory
    profile/        Profile editing
    settings/       Preferences, privacy and push notifications
    pwa/            Service worker registration and update prompts
  styles/         The design system (tokens, base, components, layout, animations)
  sw.js           Service worker source
```

### Design system

`src/styles/tokens.css` is the single source of truth for colour, elevation,
radius, spacing, typography and motion. `components.css` provides the
primitive vocabulary (buttons, fields, cards, badges, avatars, tabs, modals,
toasts, skeletons, empty states, menus) and `layout.css` composes them into
the application shell. Re-theming the product means editing tokens, not
components.

### State

| Concern           | Owner                                                   |
| ----------------- | ------------------------------------------------------- |
| Session           | `core/auth/AuthProvider` - status, user, register/login/logout, session restoration through `/auth/me` |
| Transport         | `core/api/http.js` - bearer injection, `ApiError` normalisation, 401 broadcast |
| Realtime          | `core/realtime/RealtimeProvider` - connection state, presence, typed event bus |
| Conversations     | `features/chat/context/ChatProvider` - chat list, message history, optimistic sends, chat flags |
| Contacts          | `features/friends/context/FriendsProvider` - friends, requests, directory search |
| Transient notices | `shared/components/ToastProvider`                       |

`ChatProvider` and `FriendsProvider` expose a `subscribe(event, handler)` bus
that re-emits the server's Socket.IO events, so adding a feature that reacts
to a new server event does not require touching the socket client.

### API contract

`core/api/endpoints.js` is the only place that knows a backend path. It
covers authentication, users and profiles, friends, chats, messages, media
uploads and push notifications. All calls go through `core/api/http.js`, which
turns transport failures, HTTP errors and application errors into a single
`ApiError` shape (`status`, `code`, `fieldErrors`, `isNetworkError`, …).

---

## Testing

```sh
npm run lint
npm run build
npx playwright install chromium
npm test
```

`npm test` expects the frontend on port 3000 and an **isolated test backend**
on port 5000. It creates real accounts and drives two browsers through a live
conversation. Never point it at production.

The suite covers registration, sign in, sign-out, session restoration, form
validation, wrong-credential handling, protected routes, live message
delivery, read receipts, editing, replies, typing hints, unread counters,
contact management and the narrow-viewport layout.

> The backend applies a global rate limit (600 requests per 15 minutes per
> address). A long run, or several runs in quick succession, can hit it. The
> suite reports this explicitly rather than failing with a bare status code -
> restart the backend (which resets the window) or wait before running again.

Override the target with `PLAYWRIGHT_BASE_URL`. An existing Chromium build can
be selected with `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`.

The production build includes a service worker. Test it with
`npm run preview -- --port 4173`, not the development server. Offline
navigation serves the app shell; API and Socket.IO traffic is never cached, so
a stale response cannot break authentication or messaging.

---

## Extending the application

* **A new server event** - add the event name to the `serverEvents` list in
  `core/realtime/RealtimeProvider.jsx` and subscribe to it with
  `useRealtimeEvent(event, handler)`.
* **A new backend endpoint** - add a named function to `core/api/endpoints.js`.
  Nothing else needs to change.
* **A new screen** - create a page under `features/<name>/pages`, wrap it in
  `app/AppLayout.jsx` if it should sit beside the messaging surface, and add a
  route in `app/App.jsx` behind `<RequireAuth>`.
* **A new visual element** - add a primitive to `shared/components` and its
  styles to `styles/components.css` using the existing tokens.
* **A new feature flag** - add it to `core/config.js` with a default, and
  document it in `.env.example`.
