# Project instructions and context

Updated: 2026-10-28.

## Project

- Help Desk is a TypeScript npm workspace with a React/Vite client and an Express server backed by Prisma 7 and PostgreSQL.
- Product scope is in `project-scope.md`; future work is outlined in `implementation-plan.md`. Planned features should not be treated as implemented.
- Existing screens: login, authenticated home (`/`), admin-only Users (`/users`, currently just a heading), session loading/error, and not-found.
- Authentication uses Better Auth with database sessions, email/password login, and protected/guest route guards. Login validation uses React Hook Form and Zod. Public signup is disabled. Users have admin/agent roles.
- Better Auth rate limiting is explicitly enabled only when `NODE_ENV === 'production'` in `server/src/auth.ts`; it is disabled in development and test environments.
- `ProtectedRoute` accepts `requiredRole`; `/users` requires `admin`. Signed-out visitors redirect to `/login`; authenticated users without the required role redirect to `/`. Pending or failed session checks block page content.
- The auth client uses `inferAdditionalFields` to type the server-owned `role` field. Keep its schema aligned with `server/src/auth.ts`; role input is disabled. The current restriction guards the client route; user-management APIs and server-side role authorization remain future work.
- `server/src/app.ts` mounts Better Auth at `/api/auth/{*path}` before the JSON body parser. The implemented health endpoints are `/api/health` and `/api/health/database`; ticket, AI, and email features remain planned.

## UI decisions

- Use Tailwind CSS utilities on every page. The handwritten CSS rules were removed; avoid introducing page-specific custom CSS.
- Tailwind CSS 4.3.3 is integrated through `@tailwindcss/vite`.
- shadcn/ui is initialized in `client/components.json` using its current defaults: `base-nova`, neutral base color, CSS variables, Lucide icons, and Geist Variable font.
- `client/src/styles.css` now contains the generated shadcn theme, base styles, and imports. Keep these standard theme definitions; use semantic utilities such as `bg-background`, `text-foreground`, `text-muted-foreground`, and `border-border` instead of the former green palette.
- Installed UI components live in `client/src/components/ui/`: Button, Input, Label, Checkbox, Card, and Alert. Use these for corresponding controls and surfaces.
- The `@/*` alias resolves to `client/src/*` in TypeScript and Vite. `client/src/lib/utils.ts` re-exports `cn`.
- `client/src/components/AppLayout.tsx` provides the shared navbar and logout handling for Home and Users. Add future authenticated pages under this layout in `App.tsx` and forward session context through its Outlet. Login, session loading/error, and not-found remain outside the layout.
- The shared navbar uses a locally scoped `dark` theme with `bg-background text-foreground`, inverting its background, text, brand, avatar, and logout button. Page content retains the light theme. The Users link is visible only to admins.
- The remember-me Checkbox is controlled through React Hook Form's Controller.

## Development

- Node.js 22.12+ is required by the root `package.json`. The `client` and `server` workspaces use ES modules.
- Start both applications with `npm.cmd run dev`; client is on port 5173 and proxies `/api` to port 3000.
- `server/src/config.ts` loads `server/.env`. `DATABASE_URL` configures PostgreSQL through `server/src/database.ts`; the API checks the database connection before listening. `PORT` defaults to 3000. In production, Express also serves `client/dist`.
- Prisma schema and migrations live in `server/prisma/`, with datasource configuration in `server/prisma.config.ts`. Prisma Client is generated into the ignored `server/src/generated/prisma/` directory; server development, build, and type-check scripts generate it through their pre-hooks.
- Use Context7 for current library/framework/CLI documentation, resolving the library ID before querying docs.
- On this Windows workspace, use `npm.cmd`/`npx.cmd` when PowerShell execution policy blocks the `.ps1` wrappers.
- `server/prisma/seed.ts` provisions an admin using `ADMIN_EMAIL` and `ADMIN_PASSWORD`, creates or promotes the matching user, updates its credential password, and revokes its sessions. There is no application user-creation UI or committed development agent-provisioning script yet.

## Reusable agents

- `.codex/agents/security-reviewer.toml`: reviews security issues and reports findings without editing application files.
- `.codex/agents/playwright-e2e.toml`: writes, maintains, runs, and debugs browser tests.
- `.codex/agents/project-info-updater.toml`: verifies repository facts and updates this file.

Testing instructions and verification history live in `.codex/agents/playwright-e2e.toml`.
