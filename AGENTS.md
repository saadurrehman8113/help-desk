# Project instructions and context

Updated: 2026-10-22.

## Project

- Help Desk is a TypeScript npm workspace with a React/Vite client and an Express server backed by Prisma 7 and PostgreSQL.
- Product scope is in `project-scope.md`; future work is outlined in `implementation-plan.md`. Planned features should not be treated as implemented.
- Existing screens: login, authenticated home, session loading/error, and not-found.
- Authentication uses Better Auth with database sessions, email/password login, and protected/guest route guards. Login validation uses React Hook Form and Zod. Public signup is disabled. Users have admin/agent roles; role-based authorization remains planned.

## UI decisions

- Use Tailwind CSS utilities on every page. The handwritten CSS rules were removed; avoid introducing page-specific custom CSS.
- Tailwind CSS 4.3.3 is integrated through `@tailwindcss/vite`.
- shadcn/ui is initialized in `client/components.json` using its current defaults: `base-nova`, neutral base color, CSS variables, Lucide icons, and Geist Variable font.
- `client/src/styles.css` now contains the generated shadcn theme, base styles, and imports. Keep these standard theme definitions; use semantic utilities such as `bg-background`, `text-foreground`, `text-muted-foreground`, and `border-border` instead of the former green palette.
- Installed UI components live in `client/src/components/ui/`: Button, Input, Label, Checkbox, Card, and Alert. Use these for corresponding controls and surfaces.
- The `@/*` alias resolves to `client/src/*` in TypeScript and Vite. `client/src/lib/utils.ts` re-exports `cn`.
- The home navbar uses a locally scoped `dark` theme with `bg-background text-foreground`, inverting its background, text, brand, avatar, and logout button. Other screens retain the light theme.
- The remember-me Checkbox is controlled through React Hook Form's Controller. Tests should query it by checkbox role and accessible name because Base UI also renders a hidden form input.

## Verification and development

- Last verified: client production build passes; all 12 client tests passed after the shadcn migration. The build also passed after the navbar color change.
- Client checks: `npm.cmd run build -w client` and `npm.cmd test -w client`.
- Root `npm.cmd test` runs server tests only.
- Start both applications with `npm.cmd run dev`; client is on port 5173 and proxies `/api` to port 3000.
- Use Context7 for current library/framework/CLI documentation, resolving the library ID before querying docs.
- On this Windows workspace, use `npm.cmd`/`npx.cmd` when PowerShell execution policy blocks the `.ps1` wrappers.
