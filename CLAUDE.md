# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

personal-md is a privacy-first personal wiki / "life OS". User markdown notes live in the user's own storage (local folder via the File System Access API, or a GitHub repo via PAT) — **never on our servers**. An MCP server (planned, separate package) will expose that data to AI assistants.

When proposing features or architecture, default to the no-server-side-data constraint. Anything that requires storing user content on our infrastructure is out of scope.

## Commands

```bash
npm run dev           # Next.js dev server (http://localhost:3000)
npm run build         # Production build
npm run lint          # ESLint (next lint)
npx tsc --noEmit      # Type check (matches CI)
npm run test:e2e      # Playwright e2e (builds + starts prod server first)
npm run test:e2e:ui   # Playwright UI mode
npx playwright test e2e/home.spec.ts          # Run a single spec
npx playwright test -g "name of test"         # Filter by test name
```

CI (`.github/workflows/ci.yml`) runs build → e2e in sequence; e2e runs inside the official Playwright container (`mcr.microsoft.com/playwright:v1.59.1-noble`) on Chromium only.

## Architecture

### Provider abstraction (the central pattern)

`lib/types.ts` defines `VaultProvider` — a single interface implemented by:

- `lib/storage/local-provider.ts` (`LocalGitProvider`): wraps a `FileSystemDirectoryHandle` from the File System Access API and uses `isomorphic-git` against an `fs-adapter.ts` shim.
- `lib/storage/github-provider.ts` (`GitHubProvider`): GitHub Contents API; `writesAreCommits === true` so callers skip the explicit `commit()` step.

UI code (`components/vault/*`) only sees `VaultProvider` — it must not branch on `type` except via the existing `writesAreCommits` flag. Add new backends by implementing the interface and wiring them into `lib/storage/index.ts`.

### Vault state lifecycle

- `lib/vault-context.tsx` owns the singleton provider and `VaultStatus` state machine (`idle | connecting | permission-required | ready | error`). Mounted via `components/vault-provider-wrapper.tsx` inside the root layout.
- Persistence is **IndexedDB only** (`lib/storage/idb.ts`) — `FileSystemDirectoryHandle` for local, PAT/owner/repo for GitHub. Never write tokens to localStorage, cookies, or the server.
- On reload, `createProviderFromPersistedState()` may return `needsPermission: true` for local handles where the browser revoked permission; `requestPermissionAndCreate()` must be invoked from a user gesture (button click) to re-grant.

### Routing

App Router with two main routes:
- `/` — landing + connect dialog
- `/vault` and `/vault/[...path]` — both render `<VaultShell />`. The catch-all is the source of truth for the selected note; `VaultShell` syncs URL ↔ selection and auto-selects the first note when landing on `/vault` bare.

### Editor

TipTap-based rich-text editor in `components/tiptap/`. The editor produces HTML; conversion to/from markdown lives in `lib/markdown.ts` (unified/remark) and persistence is handled by `lib/autosave.ts`. Toolbar buttons are split into one file per mark/node under `components/tiptap/toolbars/`.

### shadcn/ui convention

Components are **hand-coded into `components/ui/`**, not added via the shadcn CLI, because the project is sometimes pushed via the GitHub MCP which can't run the CLI. When adding a new shadcn component, copy the source from the shadcn registry into `components/ui/` directly. `components.json` uses the `default` style with `neutral` base color and Lucide icons.

### Styling

Tailwind CSS v4 (PostCSS plugin, no `tailwind.config.*` — config lives in `app/globals.css` via `@theme`). Dark mode via `next-themes` (`attribute="class"`, system default). Use the `cn()` helper from `@/lib/utils`.

## Conventions

- Path alias `@/*` → repo root (see `tsconfig.json`).
- Workspace is configured for `packages/*` (none yet — reserved for the future `personal-md-mcp` package).
- Hosted on Vercel (free tier, team `williamfclarkes-projects`); `vercel.json` is intentionally minimal.
