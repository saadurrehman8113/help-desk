# Help Desk

A full-stack TypeScript foundation with React, Vite, and Express. The client checks the live API connection with loading, success, failure, and retry states.

## Requirements

- Node.js 22.12+ (Node.js 24 recommended)
- npm

## Quick start

```sh
npm install
npm run dev
```

Open http://localhost:5173. Express runs at http://localhost:3000; Vite proxies `/api` requests to it. Both processes restart on changes. On Windows PowerShell, use `npm.cmd` if execution policy prevents running `npm.ps1`.

## Structure

```text
client/                 React application
  src/App.tsx           API connection example
  vite.config.ts        Development proxy
server/                 Express application
  src/app.ts            Routes and error handling
  src/index.ts          HTTP listener and shutdown handling
  test/app.test.ts      API integration tests
```

## Verification

```sh
npm run typecheck
npm test
npm run build
```

## Production

After building, set `NODE_ENV=production` and run `npm start`. Express serves the built client and API on port 3000.

```powershell
$env:NODE_ENV = "production"
npm.cmd start
```

```sh
NODE_ENV=production npm start
```

## Configuration

Optionally copy `server/.env.example` to `server/.env`. The server loads that file when launched through the workspace scripts; existing environment variables take precedence.

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3000` | Express listening port |
| `NODE_ENV` | unset | Set to `production` to serve the built React app |

If you change the backend port, update the proxy target in `client/vite.config.ts`.

## API

`GET /api/health` returns:

```json
{ "status": "ok", "service": "help-desk-api" }
```

Unknown API routes return JSON with status 404. Invalid JSON bodies return status 400; oversized bodies return status 413. Unexpected errors return a generic status 500 response.

## Scope and documentation

This implements the application scaffold. PostgreSQL, authentication, ticket management, AI, and email integrations remain planned in `implementation-plan.md`; they are not implemented yet.

Context7 was requested but its tools were unavailable in the creation session. Official [Vite documentation](https://vite.dev/guide/) and [Express 5 documentation](https://expressjs.com/en/guide/migrating-5/) were used as a fallback.
