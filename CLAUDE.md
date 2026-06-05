# CLAUDE.md

**Quick-start guide for Claude Code - Complete details in linked docs**

---

## Project Overview

The Agrilogy customer dashboard. Next.js 14 app router; users log in to
see live sensor charts, configure alerts, and (for staff users) the
admin tree for zones / activity / per-user prefs.

**Tech Stack**: Next.js 14 · React 18 · TypeScript · Tailwind · Chakra UI ·
Ant Design (admin) · axios · simplejwt access tokens · Vercel deploy.

## Sibling repos

| Repo          | Path              | Role                                                                                          |
| ------------- | ----------------- | --------------------------------------------------------------------------------------------- |
| `agri-api`    | `../agri-api/`    | HTTP API. Consumed via `src/app/lib/api.ts` (`/users/me`, `/zones`, `/alerts`, `/sensors/*`). |
| `agri-bridge` | `../agri-bridge/` | Device webhook gateway. Not called from the front.                                            |

## ⚠ Read first

1. **REST-aligned URLs** as of 2026-05-29. Old `/api/header/`, `/api/alert/`,
   `/auth/signin/` are gone — see `src/app/utils/sensorApiPaths.ts` for the
   canonical sensor slug → path table. Most calls flow through
   `src/app/lib/api.ts` (axios instance with JWT refresh).
2. **Auth tokens** in `localStorage.accessToken`. `/auth/sessions` returns
   `{ refresh, access, is_staff }`. The 401 interceptor in `api.ts` redirects
   to `/login` for non-auth endpoints.
3. **Commit rules:** local machine only; no `Co-Authored-By`; every PR pairs
   with an issue; use `mks-zakaria`.

## Quick commands

```bash
npm install
npm run dev          # next dev on :3000
npm run typecheck    # tsc --noEmit
npm run lint
npm run build
```

---

## Session Start Protocol ⚡

**MANDATORY** at start of each session:

```bash
# Load essential docs (~800 tokens - 2 min read)
✓ .claude/COMMON_MISTAKES.md      # ⚠️ CRITICAL - Read FIRST
✓ .claude/QUICK_START.md          # Essential commands
✓ .claude/ARCHITECTURE_MAP.md     # File locations
```

**At task completion:**

- Create completion doc in `.claude/completions/YYYY-MM-DD-task-name.md`
- Move session file to `.claude/sessions/archive/` (if created)

**⚠️ NEVER auto-load:**

- Files in `.claude/completions/` (0 token cost)
- Files in `.claude/sessions/` (0 token cost)
- Files in `docs/archive/` (0 token cost)

---

## Quick Start Commands

```bash
# Add your common commands here
```

---

**Last Updated**: 2026-05-29
**Optimized with**: [Claude Token Optimizer](https://github.com/nadimtuhin/claude-token-optimizer)
