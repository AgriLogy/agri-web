# CLAUDE.md

**Quick-start guide for Claude Code**

---

## Project Overview

The Agrilogy **farmer web app** (`apps/web`): customers log in to see live sensor
charts, configure alerts, and manage per-zone notifications. This is a **Turborepo
monorepo** — the app plus shared `@agri/*` packages. The **admin console is a
separate repo** (`agri-admin`); staff logins redirect there via
`NEXT_PUBLIC_ADMIN_URL`.

**Tech Stack**: Next.js 16 (app router) · React · TypeScript · Tailwind · Chakra UI ·
Ant Design · axios · simplejwt access tokens · Vercel deploy · Turborepo + npm
workspaces.

## Monorepo layout

```
apps/web/                 # the farmer Next app (package "web")
packages/
  api-client/   @agri/api-client      # axios instance + JWT + every *Api wrapper + storage
  i18n/         @agri/i18n            # locale config + FR/AR/EN messages + getMessages
  sensor-catalog/ @agri/sensor-catalog # sensor catalog + canonical endpoint paths
  ui/           @agri/ui             # design tokens, Chakra theme, EmotionCache, antdTheme
```

Shared code lives in a `packages/*` workspace and is imported as `@agri/*` (compiled
via each app's `transpilePackages`). Full CI/CD + Vercel notes: **`docs/MONOREPO.md`**.

## Sibling repos (siblings of this repo on disk)

| Repo          | Path              | Role                                                       |
| ------------- | ----------------- | ---------------------------------------------------------- |
| `agri-api`    | `../agri-api/`    | HTTP API (`/users/me`, `/zones`, `/alerts`, `/sensors/*`). |
| `agri-admin`  | `../agri-admin/`  | Standalone admin console (separate deploy + repo).         |
| `agri-bridge` | `../agri-bridge/` | Device webhook gateway. Not called from the front.         |

## ⚠ Read first

1. **API client lives in `@agri/api-client`** — the axios instance + JWT refresh is
   `packages/api-client/src/api.ts` (imported as `@agri/api-client/api`); `baseURL`
   comes from `NEXT_PUBLIC_API_URL`. The canonical sensor slug → path table is
   `@agri/sensor-catalog` (`packages/sensor-catalog/src/sensorApiPaths.ts`). REST-aligned
   URLs — old `/api/header/`, `/api/alert/`, `/auth/signin/` are gone.
2. **Auth tokens** in `localStorage.accessToken`. `/auth/sessions` returns
   `{ refresh, access, is_staff, is_technician }`. The 401 interceptor redirects to
   `NEXT_PUBLIC_LOGIN_PATH` (default `/login`) for non-auth endpoints.
3. **Env** — see `apps/web/.env.example`. Key vars: `NEXT_PUBLIC_API_URL`,
   `NEXT_PUBLIC_ADMIN_URL`, `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`.
4. **Commit rules:** local machine only; Conventional Commits (enforced by the
   commit-msg hook); no `Co-Authored-By`; every PR pairs with an issue; use
   `mks-zakaria`. Hooks pass on their own — no `--no-verify` needed.

## Commands (run from repo root — all delegate to turbo)

```bash
npm install
npm run dev          # turbo run dev (apps/web on :3000)
npm run typecheck    # turbo run typecheck (tsc --noEmit)
npm run lint
npm run build        # turbo run build
npm run test         # turbo run test (jest; AlertForm suite fails on next-intl ESM — known)
```

## Gotchas

- Run `npm run typecheck` on every change — `next build` skips test files.
- `next-intl` is globally mocked in jest; keep testable logic in pure, dependency-free
  modules (next-intl ESM doesn't parse under jest).
- Releases are automatic: pushing Conventional Commits to `main` runs semantic-release
  (version bump + CHANGELOG + tag). Vercel rejects `mks-zakaria`-authored deploys, so
  production rides the release-bot commit.

---

**Last Updated**: 2026-06-18
