# Monorepo (Turborepo) — layout, CI/CD & deploy

The frontend is a Turborepo (npm workspaces). Two Next apps — the farmer app
(`apps/web`) and the admin console (`apps/admin`) — share code from `packages/*`.

```
package.json            # workspace root: turbo + husky/lint-staged/semantic-release
turbo.json              # build/lint/typecheck/test/dev pipeline
apps/
  web/                  # farmer Next app (package "web") — :3000
  admin/                # admin console (package "admin") — :3001; routes under /admin/*
packages/
  api-client/           # @agri/api-client — axios + JWT + every *Api wrapper + storage helpers
  i18n/                 # @agri/i18n — locale config + FR/AR/EN messages + getMessages
  sensor-catalog/       # @agri/sensor-catalog — sensor catalog + endpoint paths
  ui/                   # @agri/ui — design tokens, Chakra theme, EmotionCache, antdTheme
```

Shared packages are consumed as `@agri/*` and compiled via the app's
`transpilePackages` (next.config.mjs). New shared code goes in a package and is
added there.

## Commands (run from repo root)

```bash
npm install            # installs all workspaces (single root lockfile)
npm run dev            # turbo run dev (apps/web on :3000)
npm run build          # turbo run build (all apps)
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
- `.github/workflows/deploy-front.yml` — legacy DigitalOcean droplet deploy on `alpha`.
  ⚠️ Needs updating for the monorepo (the Dockerfile + docker-compose now live under
  `apps/web/`) or disabling once Vercel is the deploy target.

## Vercel (per-app projects)

Each app is its own Vercel project pointing at the same repo:

| Vercel project | Root Directory | Domain (suggested)                           |
| -------------- | -------------- | -------------------------------------------- |
| web (farmer)   | `apps/web`     | `www.agrogo-datafarm.com`                    |
| admin          | `apps/admin`   | `admin.agrogo-datafarm.com` / `back.agrogo…` |

Setup for each project (one-time, in the Vercel dashboard):

1. **Root Directory** → `apps/web` (resp. `apps/admin`). Vercel detects the workspace
   root, runs `npm install` there, and builds the app.
2. Framework preset: **Next.js** (auto). `apps/web/vercel.json` already sets
   `ignoreCommand: npx turbo-ignore web` so a push only rebuilds the project when that
   app or one of its workspace deps changed.
3. Add the domain under the project's **Domains** tab.

Env vars (e.g. `NEXT_PUBLIC_*`, `PROXY_API_TARGET`) are set per Vercel project.
Two to set after the admin domain exists:

- **web** → `NEXT_PUBLIC_ADMIN_URL = https://back.agrogo….` (or admin.agrogo…) so a
  staff login on the farmer app forwards to the admin console. Without it, staff
  fall back to `/admin` (which only resolves when the admin routes are co-hosted).
- **admin** → the same API base / proxy env the web app uses, so `@agri/api-client`
  hits the backend. Add an `apps/admin/.env.local` mirroring `apps/web/.env.local`
  for local dev.

CI (`ci.yml` / `release.yml`) runs `npm run build` = `turbo run build`, which builds
**both** apps, so a broken admin or web build fails the pipeline.

> Note (from project memory): Vercel rejects deploys authored by `mks-zakaria`;
> production deploys ride the `semantic-release-bot` release commit on the production
> branch. Previews build from pushed branches once Root Directory is set.
