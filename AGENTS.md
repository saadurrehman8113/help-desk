# Project instructions and context

Updated: 2026-10-22.

## Project

- Help Desk is a TypeScript npm workspace with a React/Vite client and an Express server backed by Prisma 7 and PostgreSQL.
- Product scope is in `project-scope.md`; future work is outlined in `implementation-plan.md`. Planned features should not be treated as implemented.
- Existing screens: login, authenticated home (`/`), admin-only Users (`/users`, currently just a heading), session loading/error, and not-found.
- Authentication uses Better Auth with database sessions, email/password login, and protected/guest route guards. Login validation uses React Hook Form and Zod. Public signup is disabled. Users have admin/agent roles.
- `ProtectedRoute` accepts `requiredRole`; `/users` requires `admin`. Signed-out visitors redirect to `/login`; authenticated users without the required role redirect to `/`. Pending or failed session checks block page content.
- The auth client uses `inferAdditionalFields` to type the server-owned `role` field. Keep its schema aligned with `server/src/auth.ts`; role input is disabled. The current restriction guards the client route; user-management APIs and server-side role authorization remain future work.

## UI decisions

- Use Tailwind CSS utilities on every page. The handwritten CSS rules were removed; avoid introducing page-specific custom CSS.
- Tailwind CSS 4.3.3 is integrated through `@tailwindcss/vite`.
- shadcn/ui is initialized in `client/components.json` using its current defaults: `base-nova`, neutral base color, CSS variables, Lucide icons, and Geist Variable font.
- `client/src/styles.css` now contains the generated shadcn theme, base styles, and imports. Keep these standard theme definitions; use semantic utilities such as `bg-background`, `text-foreground`, `text-muted-foreground`, and `border-border` instead of the former green palette.
- Installed UI components live in `client/src/components/ui/`: Button, Input, Label, Checkbox, Card, and Alert. Use these for corresponding controls and surfaces.
- The `@/*` alias resolves to `client/src/*` in TypeScript and Vite. `client/src/lib/utils.ts` re-exports `cn`.
- `client/src/components/AppLayout.tsx` provides the shared navbar and logout handling for Home and Users. Add future authenticated pages under this layout in `App.tsx` and forward session context through its Outlet. Login, session loading/error, and not-found remain outside the layout.
- The shared navbar uses a locally scoped `dark` theme with `bg-background text-foreground`, inverting its background, text, brand, avatar, and logout button. Page content retains the light theme. The Users link is visible only to admins.
- The remember-me Checkbox is controlled through React Hook Form's Controller. Tests should query it by checkbox role and accessible name because Base UI also renders a hidden form input.

## Verification and development

- Last verified: client production build passes and all 22 client tests pass after the shared navbar change. Tests cover admin-only access, session failures/loading, role loss, navbar persistence across navigation, agent link visibility, and logout errors on Users.
- Client checks: `npm.cmd run build -w client` and `npm.cmd test -w client`.
- Root `npm.cmd test` runs server tests only.
- Start both applications with `npm.cmd run dev`; client is on port 5173 and proxies `/api` to port 3000.
- Use Context7 for current library/framework/CLI documentation, resolving the library ID before querying docs.
- On this Windows workspace, use `npm.cmd`/`npx.cmd` when PowerShell execution policy blocks the `.ps1` wrappers.
- A local account named Agent with email `agent@example.com` and role `agent` was provisioned in the configured database. Its password is not stored in project files. `server/prisma/seed.ts` provisions the admin only; there is no committed agent provisioning script or user-creation UI yet.
