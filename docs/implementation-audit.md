# Talish Talks implementation audit

## Scope and baseline

Audited and modified the existing React frontend and Express/Mongoose/Socket.IO backend, starting from commit `0cb4261`. Existing account, friend, conversation, message, media, lock, notification and PWA contracts were retained. No production database or production account was used.

Baseline checks:

- Both production builds installed and built, with an approximately 586 kB frontend chunk warning.
- Frontend lint reported 71 errors.
- Backend startup failed when optional VAPID variables were absent.
- Source review found missing membership checks in single-message deletion,ObjectId comparisons using reference/ObjectId equality, room-only deletion events, incomplete bulk-event handling, stale chat previews, non-durable delayed cleanup, and optimistic messages that could be restored by an in-flight history response.

## Implemented changes

### Messaging and deletion

- Centralized participant visibility, message serialization, personal previews and unread counts.
- Enforced conversation membership for single and bulk deletion; only the sender can delete for everyone.
- Validate the entire bulk batch before writes, deduplicate IDs, return confirmed `deletedIds`, and make repeated personal deletion safe.
- Persist personal deletion with atomic set updates. Remove the stored message/media only when both participants have deleted it.
- Broadcast deletion/edit/read events to each participant's authenticated personal room, covering other tabs and closed conversation views.
- Recompute visible previews and unread counts after deletion, clearing and expiry; serialize summary snapshots per chat.
- Reconcile HTTP responses, socket events and history by database ID and durable `clientId`; tombstone deleted IDs against in-flight history.
- Keep failed text/media sends in a session outbox across conversation switches. Retry media with the same file and client ID; expose upload progress and explicit discard.
- Use a cursor for older-history requests so concurrent deletion does not shift an offset page. Preserve scroll position and buffer live arrivals during history loads.
- Persist delayed disappearing-message deadlines instead of relying on a process-local timeout.

### Real-time, accounts and security

- JWT-authenticated Socket.IO rooms, membership-checked chat joins/typing, token-expiry disconnect, listener cleanup and reconnect resynchronization.
- Exact-origin CORS and cookie-mutation origin checks, bounded inputs, rate limits, safer error responses and required environment validation.
- Optional VAPID configuration must be a matched pair; push subscriptions require trusted HTTPS providers and validated keys.
- Media uploads authorize the actual conversation participants before remote storage. The Cloudinary adapter was replaced with a bounded memory-buffer/upload-stream flow using Cloudinary 2, explicit abort/timeout cleanup, image limits and video-duration validation.
- Avatar persistence happens before old-asset cleanup; a failed database save removes the new asset and preserves the old avatar.
- Chat-lock first-PIN initialization uses compare-and-set. Device-lock passwords use salted PBKDF2 with legacy-hash migration; the UI explicitly distinguishes privacy locks from encryption/authentication.
- Removed third-party generated-avatar requests and unused theme/toast/cropping/animation code. Updated vulnerable runtime dependencies, including Axios, Socket.IO's parser, Mongoose, Multer, Cloudinary and React Router.

### Interface and navigation

- One light palette: `#F5F7FA` canvas, white surfaces, `#0866FF` brand, `#1C1E21`/`#65676B` text and `#E4E6EB` borders; native system fonts.
- Modernized existing authentication, chat, friends, profile, media, settings, loading/error/empty and PWA states with the existing icon library. Decorative UI emojis were removed; user message content is untouched.
- Responsive sidebar/conversation layouts, safe-area padding, visual-viewport sizing, 16 px inputs, reduced-motion handling and local avatar fallbacks.
- Shared history-aware overlays handle Back, nested dialogs, dialog replacement and React StrictMode. Body scroll locking is reference-counted.
- Updated favicon/PWA icons to the light brand. The service worker supports offline SPA deep links without caching private API responses.

## Verified results

All runs used Node 22.22.3, an isolated MongoDB 8.0.26 test server and Chromium.

| Check | Result |
| --- | --- |
| Backend integration suite | **17/17 passed** |
| Two-user Playwright suite | **7/7 passed** |
| Frontend ESLint, including tests/config | **Passed, no warnings** |
| Production frontend + PWA build | **Passed, no chunk-size warning** |
| Backend JavaScript syntax checks | **Passed** |
| `git diff --check` | **Passed** |
| Backend `npm audit` | **0 vulnerabilities** |
| Frontend runtime `npm audit --omit=dev` | **0 vulnerabilities** |
| Additional desktop/mobile registration/friends/messaging smoke | **Passed; no browser console errors** |
| Production PWA smoke | **Passed: service-worker control, offline deep-link shell, manifest/icons, no page errors** |

The browser suite verifies:

1. Live two-user delivery, private delete-for-me, sender-only delete-for-everyone and persistence after reload.
2. Bulk selection, sender ownership, confirmed deletion and refreshed previews.
3. Failed-send visibility and same-client-ID retry without duplicate stored messages.
4. Rapid sends, editing, replies, typing and second-tab reconciliation.
5. Older-history scroll preservation and recovery of messages missed while offline.
6. Widths **320, 375, 390, 430, 768, 1024 and 1440**, mobile Back, nested dialog scroll locks, chat-lock setup/reveal and device-lock setup/reload/unlock.
7. Failed-media retention across chat switching and retry of the same file/client ID.

Backend tests additionally cover authorization, idempotency, pagination/cursors, personal clear/delete, regex-safe search, expiry after worker restart, concurrent pair creation, concurrent first PIN initialization, trusted push targets, participant-specific upload blocking, duplicate media cleanup and avatar rollback. Storage/database failure paths use explicit test doubles; they are not live Cloudinary tests.

## Run locally

Use Node 22+ and a MongoDB database. Configure real secrets outside Git.

```sh
cd backend
npm ci
cp .env.example .env
# Edit .env before starting.
npm run dev

# Second terminal
cd frontend
npm ci
cp .env.example .env
npm run dev
```

Backend tests require an explicitly disposable database whose name contains `test`:

```sh
cd backend
TEST_MONGODB_URI=mongodb://127.0.0.1:27017/talish_isolated_test npm test
```

Alternatively set `TEST_MONGOD_PATH` to a local `mongod` executable. The runner starts it on a free loopback port and removes only its temporary test database. Never point either option at production.

Browser tests require both development servers and use isolated test accounts:

```sh
cd frontend
npx playwright install chromium
npm test
```

The sandbox runs used an existing Chromium executable and an isolated MongoDB on port 27027. The equivalent commands were:

```sh
# backend/
TEST_MONGODB_URI=mongodb://127.0.0.1:27027/talish_final_test npm test
# frontend/
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/tmp/chromium LD_LIBRARY_PATH=/tmp/al2023/lib npm test
```

## Environment and deployment

Backend variables are documented in `backend/.env.example`:

- Required: `MONGODB_URI`, `JWT_SECRET` (at least 32 characters).
- Server/origins: `PORT`, `NODE_ENV`, `CLIENT_URL` (exact comma-separated origins).
- Optional media: all three `CLOUDINARY_*` variables.
- Optional push: matched `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`, plus `VAPID_SUBJECT`.
- Test-only: `TEST_MONGODB_URI` or `TEST_MONGOD_PATH`.

Frontend variables are documented in `frontend/.env.example`:

- `VITE_API_URL`, `VITE_SOCKET_URL`: empty for same-origin/Vite proxy; explicit URLs for separate hosting.
- `VITE_VAPID_PUBLIC_KEY`: public key matching the backend.
- `VITE_APP_URL`: optional public invitation URL.
- `PLAYWRIGHT_BASE_URL`, `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`: browser-test configuration.

Frontend variables are embedded at build time. Keep the existing Netlify publish directory `frontend/dist` and build command `cd frontend && npm ci && npm run build`; retain SPA fallback to `index.html`. Configure the backend host separately with WebSocket support, HTTPS, exact frontend origins and the same environment names. The backend assumes one trusted proxy hop; align that setting with the actual deployment topology before exposing it publicly.

## Remaining limits

- No production credentials, Cloudinary account, push subscription/service, deployed backend or production data were available. Live remote upload/download, push delivery, deployment TLS/proxy behavior and production load were not tested.
- Browser coverage is Chromium, not real iOS/Safari or Firefox. Safe-area/keyboard code is implemented, but physical-device keyboard and installed-PWA behavior still need device QA.
- Pair-creation serialization and summary ordering are process-local. The existing deployment is assumed to run one API process. Multiple API instances need a shared Socket.IO adapter and a database-level pair-uniqueness strategy; no speculative schema migration was added.
- The full frontend development-tool audit still reports **15 low/moderate advisories** in the ESLint/PWA build dependency graphs. Runtime and backend audits are clean. No forced downgrade or unverified replacement package was applied.
- Device/chat locks are privacy screens, not end-to-end encryption. Existing token storage and account/authentication contracts were preserved.
- Media remains subject to the existing two-minute expiry feature. Retry files live only in the current browser session; reloading the page cannot recover a local file that was never uploaded.
- This is a verified implementation pass, not a claim of exhaustive production readiness. Run staged deployment checks with real service credentials and physical mobile devices before release.
