# Talish Talks frontend

React + Vite client for the existing Express/Socket.IO API.

## Development

From this directory:

```sh
npm ci
cp .env.example .env
npm run dev
```

The development server listens on `0.0.0.0:3000` and proxies `/api` and `/socket.io` to the backend on port 5000. Leave `VITE_API_URL` and `VITE_SOCKET_URL` empty for this setup or a same-origin deployment. For separate API hosting, set both explicitly; the API URL must include `/api`, and its origin must be listed in backend `CLIENT_URL`.

## Checks

```sh
npm run lint
npm run build
npx playwright install chromium
npm test
```

`npm test` expects the frontend on port 3000 and an **isolated test backend** on port 5000. It creates real test accounts and exercises two-user messaging. Never target production. Override `PLAYWRIGHT_BASE_URL` when necessary. An existing Chromium can be selected with `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`.

The production build includes a service worker. Test it with `npm run preview -- --port 4173`, not the development server. Offline navigation serves the app shell; private messages are not written to an offline cache.

See `../docs/implementation-audit.md` for the audit, verified results, deployment variables, and remaining limitations.
