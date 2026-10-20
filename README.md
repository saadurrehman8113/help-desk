# Help Desk

A full-stack TypeScript foundation with React, Vite, Express, Prisma 7, and PostgreSQL. The client checks the live API connection with loading, success, failure, and retry states.

## Requirements

- Node.js 22.12+ (Node.js 24 recommended)
- npm

## Quick start

```sh
npm install
```

Create `server/.env` using `server/.env.example`, and set `DATABASE_URL` to your PostgreSQL `help-desk` database connection string. Set `BETTER_AUTH_SECRET` to a cryptographically random secret of at least 32 characters and `BETTER_AUTH_URL` to your API's base URL. The server verifies the database connection before accepting requests.

```sh
npm run db:check -w server
npm run db:deploy -w server
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
  src/database.ts       Reusable Prisma client with PostgreSQL adapter
  prisma/schema.prisma  Database schema and client generator
  prisma.config.ts      Prisma CLI configuration
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

Copy `server/.env.example` to `server/.env`. The server and Prisma CLI load that file; existing environment variables take precedence. Never commit database credentials. Percent-encode URL-reserved characters in the username and password.

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3000` | Express listening port |
| `NODE_ENV` | unset | Set to `production` to serve the built React app |
| `DATABASE_URL` | required | PostgreSQL connection URL targeting `help-desk` |
| `BETTER_AUTH_SECRET` | required | Random authentication secret, at least 32 characters; keep private and stable |
| `BETTER_AUTH_URL` | `http://localhost:3000` in the example | Public API base URL; set to your HTTPS origin in production |
| `BETTER_AUTH_TRUSTED_ORIGINS` | empty; `http://localhost:5173` in the example | Comma-separated additional trusted frontend origins; surrounding whitespace and empty entries are ignored |

If you change the backend port, update the proxy target in `client/vite.config.ts`.

## Database

Prisma uses the PostgreSQL driver adapter and generates an ESM TypeScript client under `server/src/generated/prisma/`. Development, build, typecheck, and test scripts generate the client automatically.

```sh
npm run db:check -w server       # Verify the connection and database name
npm run db:validate -w server    # Validate the Prisma schema
npm run db:generate -w server    # Regenerate the client
npm run db:pull -w server        # Introspect existing database tables
npm run db:studio -w server      # Browse database data
```

The schema includes Better Auth's User, Account, Session, and Verification models. The `add_auth` migration creates their tables. Use `npm run db:migrate -w server -- --name <change>` for future schema changes in development and `npm run db:deploy -w server` to apply committed migrations in production.

## Authentication

Users have one role: `admin` or `agent`. Existing users and newly provisioned users default to `agent`. The role is returned with the authenticated user and cannot be set through user-facing auth input; it does not add application permission checks by itself.

### Seed an admin

Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in the ignored `server/.env`, then run:

```sh
npm run db:deploy -w server
npm run db:seed -w server
```

The seed creates or promotes the matching user to `admin` and stores a Better Auth password hash in its credential account. Rerunning updates that user's password from the environment without duplicating the user/account and revokes their existing sessions. Public sign-up stays disabled.

Better Auth provides email/password sign-in and database-backed sessions under `/api/auth`. Session cookies contain the session token; cookie caching is disabled by default, so session validation reads PostgreSQL. Passwords are hashed by Better Auth. Public sign-up is disabled; existing users can still sign in. Email verification and password-reset email delivery are not configured.

| Endpoint | Request body |
| --- | --- |
| `POST /api/auth/sign-up/email` | Disabled; returns `EMAIL_PASSWORD_SIGN_UP_DISABLED` (400) |
| `POST /api/auth/sign-in/email` | `{ "email": "person@example.com", "password": "a-long-password" }` |
| `GET /api/auth/get-session` | None; send the session cookie |
| `POST /api/auth/sign-out` | `{}`; send the session cookie |

For example, from a terminal supporting curl:

```sh
curl -c cookies.txt -H "Content-Type: application/json" -H "Origin: http://localhost:3000" -d '{"email":"person@example.com","password":"a-long-password"}' http://localhost:3000/api/auth/sign-in/email
curl -b cookies.txt http://localhost:3000/api/auth/get-session
curl -b cookies.txt -H "Content-Type: application/json" -H "Origin: http://localhost:3000" -d '{}' http://localhost:3000/api/auth/sign-out
```

The existing Vite `/api` proxy supports same-origin browser requests. Set `BETTER_AUTH_TRUSTED_ORIGINS=http://localhost:5173` in `server/.env` for local development. For multiple frontend origins, separate them with commas, for example `https://help.example.com,https://admin.example.com`. The configured Better Auth base URL is trusted automatically. Use the same-origin deployment in production and update `BETTER_AUTH_URL` accordingly. Restart the server after changing these settings.

To run the database-backed HTTP smoke test, generate Prisma Client, then run `npx tsx scripts/smoke-auth.ts` from `server/`. It provisions a temporary user directly in PostgreSQL, verifies that public sign-up is blocked, hashed passwords, incorrect-password rejection, sign-in, persisted sessions, and sign-out revocation, then removes its user and related records.

## API

`GET /api/health` returns:

```json
{ "status": "ok", "service": "help-desk-api" }
```

Unknown API routes return JSON with status 404. Invalid JSON bodies return status 400; oversized bodies return status 413. Unexpected errors return a generic status 500 response.

`GET /api/health/database` runs a database query and returns `{ "status": "ok", "database": "connected" }`, or status 503 with a generic unavailable response. Database credentials and errors are never returned to the client.

## Scope and documentation

This implements the application scaffold, PostgreSQL connection, and backend email/password authentication. Ticket management, AI, and email integrations remain planned in `implementation-plan.md`.

Context7 was requested but its tools were unavailable in the creation session. Official [Vite documentation](https://vite.dev/guide/) and [Express 5 documentation](https://expressjs.com/en/guide/migrating-5/) were used as a fallback.

The Prisma setup uses current documentation fetched through Context7, including [Prisma configuration](https://www.prisma.io/docs/orm/reference/prisma-config-reference) and [PostgreSQL setup](https://www.prisma.io/docs/orm/overview/databases/postgresql).

Authentication follows Better Auth documentation fetched through Context7 for [Express integration](https://www.better-auth.com/docs/integrations/express) and the [Prisma adapter](https://www.better-auth.com/docs/adapters/prisma).
