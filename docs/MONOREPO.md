# Monorepo (Turborepo) — layout, CI/CD & deploy

The frontend is a Turborepo (npm workspaces). It hosts the farmer app
(`apps/web`), with shared code factored into `packages/*`. The admin console is a
**separate repository** (`mks-zakaria/agri-admin`) deployed independently; the web
app links to it via the `NEXT_PUBLIC_ADMIN_URL` env var.

```
package.json            # workspace root: turbo + husky/lint-staged/semantic-release
turbo.json              # build/lint/typecheck/test/dev pipeline
apps/
  web/                  # farmer Next app (package "web") — :3000
packages/
  api-client/           # @agri/api-client — axios + JWT + every *Api wrapper + storage helpers
  i18n/                 # @agri/i18n — locale config + FR/AR/EN messages + getMessages
  sensor-catalog/       # @agri/sensor-catalog — sensor catalog + endpoint paths
  ui/                   # @agri/ui — design tokens, Chakra theme, EmotionCache, antdTheme
```

Shared packages are consumed as `@agri/*` and compiled via the app's
`transpilePackages` (next.config.mjs). New shared code goes in a package and is
added there. The `@agri/*` packages are intentionally app-agnostic so the standalone
`agri-admin` repo can consume them too if it later adopts the same packages.

## Commands (run from repo root)

```bash
npm install            # installs all workspaces (single root lockfile)
npm run dev            # turbo run dev (apps/web on :3000)
npm run build          # turbo run build
npm run typecheck      # turbo run typecheck
npm run lint           # turbo run lint
npm run test           # turbo run test
```

## CI/CD

- `.github/workflows/ci.yml` — lint + typecheck + format:check + build on PRs/pushes
  to `main` (root scripts delegate to turbo).
- `.github/workflows/release.yml` + `.releaserc.json` — **semantic-release** runs on
  `main`: it bumps the root `package.json` version, updates `CHANGELOG.md`, tags, and
  cuts a GitHub release automatically (Conventional Commits drive the bump). PR titles
  are linted to Conventional Commits (`lint-pr-title.yml`) so squash-merges classify.

## Vercel

The web app is its own Vercel project pointing at this repo:

| Vercel project | Root Directory | Domain (suggested)        |
| -------------- | -------------- | ------------------------- |
| web (farmer)   | `apps/web`     | `www.agrogo-datafarm.com` |

Setup (one-time, in the Vercel dashboard):

1. **Root Directory** → `apps/web`. Vercel detects the workspace root, runs
   `npm install` there, and builds the app.
2. Framework preset: **Next.js** (auto). `apps/web/vercel.json` already sets
   `ignoreCommand: npx turbo-ignore web` so a push only rebuilds when that app or one
   of its workspace deps changed.
3. Add the domain under the project's **Domains** tab.

Env vars (e.g. `NEXT_PUBLIC_*`, `PROXY_API_TARGET`) are set per Vercel project. One
to set so staff logins reach the admin console:

- **web** → `NEXT_PUBLIC_ADMIN_URL = https://back.agrogo….` (the standalone
  `agri-admin` deployment) so a staff login on the farmer app forwards to the admin
  console. Without it, staff fall back to `/admin` (which does not resolve in this
  web-only repo — set the env var in any real deployment).

CI (`ci.yml` / `release.yml`) runs `npm run build` = `turbo run build`.

> Note (from project memory): Vercel rejects deploys authored by `mks-zakaria`;
> production deploys ride the `semantic-release-bot` release commit on the production
> branch. Previews build from pushed branches once Root Directory is set.
