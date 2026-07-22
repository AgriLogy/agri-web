# Contributing to `agri-web`

`AgriLogy/agri-web` (private) is **the** Agrilogy farmer web app: customers log in to
see live sensor charts, configure alerts, organise sectors/zones and manage
notifications. It is a **Turborepo + npm-workspaces monorepo** — one Next.js 16 app
(`apps/web`) plus shared `@agri/*` packages — deployed to **Vercel**
(`app.agrogo-datafarm.com`) and talking to the **agri-api** backend at
`https://back.agrogo-datafarm.com`.

It supersedes the older single-app `agrilogy-front`, which is retired. The admin
console is a **separate repo** (`AgriLogy/agri-admin`); staff logins are redirected
there via `NEXT_PUBLIC_ADMIN_URL`.

> The root `README.md` still describes the pre-monorepo `agri-front` layout
> (`src/app/**` at the repo root, `npm run start`, `env-example`). Where the two
> disagree, **this file and `docs/MONOREPO.md` are correct.**

---

## 1. Prerequisites & first-time setup

| Item           | Value                                                                    |
| -------------- | ------------------------------------------------------------------------ |
| Package mgr    | **npm** — single root `package-lock.json`; `packageManager: npm@11.12.1` |
| Node           | No `engines` field in-repo. CI (`.github/workflows/*`) uses **Node 20**. |
| Workspaces     | `apps/*`, `packages/*`                                                   |
| Task runner    | Turborepo (`turbo.json`)                                                 |

```bash
git clone git@github.com:AgriLogy/agri-web.git
cd agri-web
npm install                       # installs every workspace from the root lockfile
cp apps/web/.env.example apps/web/.env.local
npm run dev                       # apps/web on http://localhost:3000
```

Always run npm commands **from the repo root** — the root scripts delegate to turbo.

### Environment variables

Canonical, annotated list: **`apps/web/.env.example`** (each entry names the file that
reads it). Everything below is verified as actually referenced in code.

| Variable                          | Read by                                              | Notes                                                                        |
| --------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------- |
| `NEXT_PUBLIC_API_URL`             | `packages/api-client/src/api.ts`                     | axios `baseURL`. Falls back to `https://back.agrogo-datafarm.com`.           |
| `NEXT_PUBLIC_ADMIN_URL`           | `apps/web/src/app/login/LoginBox.tsx`                | Where staff logins are forwarded (the `agri-admin` deployment).              |
| `NEXT_PUBLIC_LOGIN_PATH`          | `packages/api-client/src/api.ts` + logout handlers   | 401-interceptor target. Defaults to `/login`; full identity-gateway URL in prod. |
| `NEXT_PUBLIC_SSO_COOKIE_DOMAIN`   | `packages/api-client/src/clearSsoSession.ts`         | `.agrogo-datafarm.com` in prod, **empty** locally.                          |
| `NEXT_PUBLIC_SSO_COOKIE_NAME`     | `hydrateSsoSession.ts` / `clearSsoSession.ts`        | Defaults to `agrogo_sso`.                                                    |
| `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` | `src/app/components/map/AgricultureMapboxMap.tsx`    | Map does not render without it.                                              |
| `NEXT_PUBLIC_ASSISTANT_MOCK`      | `src/app/components/agryChatBot/ChatContext.tsx`     | `1`/`true` → offline mock chatbot engine.                                    |
| `NEXT_PUBLIC_APP_VERSION`, `NEXT_PUBLIC_ENV` | `packages/api-client/src/feedbackApi.ts`  | Metadata attached to bug reports.                                            |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` | `feedbackApi.ts` | Screenshot upload for "report an issue"; feature degrades if unset.        |
| `PROXY_API_TARGET`                | `apps/web/next.config.mjs`                           | **Local dev only.** Enables the `/api-proxy/:path*` rewrite. Leave UNSET in Vercel. |

> ⚠️ **The production API base must be an ABSOLUTE `http(s)` URL.** A relative value
> (e.g. the local-dev `/api-proxy` path) baked into a production build resolves
> against the app's own origin and 404s every request — this took the app data-dead
> once. `packages/api-client/src/api.ts` now guards against it: outside
> `NODE_ENV=development` a non-absolute `NEXT_PUBLIC_API_URL` is ignored and the
> `back.agrogo-datafarm.com` default is used. Don't rely on the guard — set the
> absolute URL in the Vercel Production environment.

Local same-origin dev (the prod backend only CORS-allows the www origin):

```bash
# apps/web/.env.local
NEXT_PUBLIC_API_URL=/api-proxy
PROXY_API_TARGET=https://back.agrogo-datafarm.com
```

---

## 2. Dev loop

```bash
npm run dev         # turbo run dev        -> next dev (apps/web, :3000)
npm run build       # turbo run build      -> next build
npm run lint        # turbo run lint       -> eslint . (apps/web only)
npm run typecheck   # turbo run typecheck  -> tsc --noEmit
npm run test        # turbo run test       -> web: check + jest
npm run check       # turbo run lint typecheck  (what the pre-push hook runs)
npm run format      # prettier --write .
npm run format:check
```

**Rule: `npm run typecheck` must pass on every frontend change.** It is not optional —
`apps/web/next.config.mjs` sets `typescript.ignoreBuildErrors: true`, so **`next build`
will happily ship type errors**, and `next build` also skips test files. Typecheck is
the only real type gate (CI runs it too).

Notes:

- `packages/*` declare no scripts, so turbo's `lint`/`typecheck`/`test` effectively run
  inside `apps/web` — which typechecks the packages anyway via `transpilePackages` +
  direct TS imports.
- Tests are **Jest + Testing Library** (`apps/web/jest.config.js`, `testMatch:
  src/**/*.test.(ts|tsx)`), run with `--passWithNoTests`. Per `CLAUDE.md` the
  `AlertForm` suite fails on next-intl ESM — known, pre-existing.
- `next-intl` is stubbed in Jest (`apps/web/__mocks__/nextIntlMock.js`). Keep testable
  logic in **pure, dependency-free modules** (`src/app/lib/`, `src/app/utils/`) — that
  is what the existing tests cover.

---

## 3. Monorepo layout

```
package.json / turbo.json      # workspace root: turbo, husky, lint-staged, semantic-release
vercel.json                    # buildCommand: npx turbo run build --filter=web
apps/web/                      # the farmer Next app (package name: "web")
packages/{api-client,i18n,sensor-catalog,ui}
docs/MONOREPO.md               # CI/CD + Vercel setup detail
```

| Workspace                | Import as              | What belongs here                                                                                 |
| ------------------------ | ---------------------- | ------------------------------------------------------------------------------------------------- |
| `apps/web`               | `@/*`, `@component/*`  | Routes, feature components, hooks, page-level logic.                                               |
| `packages/api-client`    | `@agri/api-client`     | The axios instance + JWT/SSO interceptors (`api.ts`) and every `*Api` wrapper + storage helpers.    |
| `packages/i18n`          | `@agri/i18n`           | `locales`/`defaultLocale`/`isRtl`/`dirFor`, `getMessages`, and `src/messages/{fr,en,ar}.json`.      |
| `packages/sensor-catalog`| `@agri/sensor-catalog` | Sensor catalog + canonical sensor-slug → API path table (`sensorApiPaths.ts`).                      |
| `packages/ui`            | `@agri/ui`             | Design tokens, Chakra `theme`, `EmotionCache`, `antdTheme`, `colorModeConfig`, `chartColors`.       |

`apps/web/src/app` routes (App Router, one `page.tsx` each): `/` `alerts`
`alerts/wind-speed` `chat` `crop-calendar` `farm` `login` `notification-zones`
`notifications` `plant` `settings` `soil` `station` `vannes-pompes`
`vannes-pompes/schema` `view-as` `water`. Supporting dirs: `components/<feature>/`,
`hooks/`, `lib/`, `utils/`, `styles/`, `data/`, `public/`.

### Adding a new shared package

1. `mkdir -p packages/<name>/src` and add a `package.json` mirroring an existing one
   (`private: true`, `"main"`/`"types"`: `./src/index.ts`, an `exports` map).
2. Name it `@agri/<name>`.
3. Add `"@agri/<name>": "*"` to `apps/web/package.json` dependencies.
4. Add `'@agri/<name>'` to `transpilePackages` in `apps/web/next.config.mjs`.
5. If it must be importable from Jest, add a `moduleNameMapper` entry in
   `apps/web/jest.config.js` pointing at the TS source.
6. `npm install` at the root, then `npm run typecheck`.

---

## 4. Worked example — adding a page/feature

Say you add `/harvest`.

**1. API wrapper** — `packages/api-client/src/harvestApi.ts`; never call axios from a
component (per `apps/web/docs/UI_GUIDELINES.md`).

```ts
import api from './api';

export type Harvest = { id: number; zone_id: number; harvested_at: string };

export const harvestApi = {
  list: () => api.get<Harvest[]>('/harvests').then((r) => r.data),
  create: (payload: Omit<Harvest, 'id'>) =>
    api.post<Harvest>('/harvests', payload).then((r) => r.data),
};
```

Export it from `packages/api-client/src/index.ts`. Match agri-api's REST-aligned paths
exactly (`/sectors`, `/zones`, `/alerts`, `/sensors/*`); legacy `/api/header/`,
`/api/alert/`, `/auth/signin/` are gone. Sensor endpoints come from
`@agri/sensor-catalog`, not hand-written strings.

**2. i18n keys** — add a `harvest` block to **all three** catalogs in
`packages/i18n/src/messages/`: `fr.json` (default, author here first), `en.json`,
`ar.json`. Keys are namespaced per feature (`common`, `nav`, `farm`, `alertsPage`, …).

**3. Component** — `apps/web/src/app/components/harvest/HarvestMain.tsx`, `'use client'`,
`useTranslations('harvest')`, antd for primitives / Chakra for layout / Tailwind for
responsive utilities only.

**4. Route** — `apps/web/src/app/harvest/page.tsx`, thin, wrapping in the shell:

```tsx
'use client';
import HarvestMain from '../components/harvest/HarvestMain';
import { AppPageShell } from '../components/layout/AppPageShell';

export default function Page() {
  return (
    <AppPageShell>
      <HarvestMain />
    </AppPageShell>
  );
}
```

**5. Test** — put pure logic in `src/app/lib/harvest.ts` and test it as
`src/app/lib/harvest.test.ts` (colocated `*.test.ts(x)`).

**6. Gate** — `npm run typecheck && npm run lint && npm run test`.

Read `apps/web/docs/UI_GUIDELINES.md` before writing UI — it is the binding design-system
contract (page anatomy, forms, toasts, tokens, icons). One staleness note: it says API
wrappers live in `src/app/lib/<domain>Api.ts`; they now live in `packages/api-client/src/`.

---

## 5. i18n, RTL & branding

- Locales: `fr` (default), `en`, `ar` — `packages/i18n/src/config.ts`.
- **No locale in the URL.** The active locale is persisted in the `NEXT_LOCALE` cookie
  (`apps/web/src/i18n/locale.ts`) and loaded per server render by
  `apps/web/src/i18n/request.ts` via `next-intl`.
- **`ar` is RTL.** Use `isRtl(locale)` / `dirFor(locale)` from `@agri/i18n` rather than
  hardcoding direction; avoid left/right-baked layout (prefer logical spacing).
- Never hardcode user-facing strings — every string goes through a message key in all
  three catalogs.
- Branding assets: `apps/web/src/app/public/logo.png` (imported as a module by
  `components/auth/LoginCard.tsx`, `components/main/BigMenu.tsx`,
  `components/main/MobileMenu.tsx`, `components/NonAuthNavbar .tsx`),
  `apps/web/src/app/public/weather.png`, favicon at `apps/web/src/app/favicon.ico`.
  Colors/tokens: `packages/ui/src/tokens/` — never hardcode hex in TSX.

---

## 6. Branches, commits, PRs

- Branch off **`main`** (protected, always deployable). Short-lived branches:
  `feat/<topic>`, `fix/<topic>`, `chore/<topic>`. Never push to `main`.
- **Conventional Commits**, enforced by commitlint (`commitlint.config.cjs`,
  `@commitlint/config-conventional`) through the `commit-msg` hook. PR **titles** are
  linted too (`.github/workflows/lint-pr-title.yml`) because squash-merge uses the title
  as the commit message.
- Husky hooks: `pre-commit` → `npx lint-staged`, `commit-msg` → commitlint,
  `pre-push` → `npm run check`. **They pass on their own — never use `--no-verify`.**
  `lint-staged.config.mjs` runs ESLint only on staged `apps/web` code (packages have no
  flat config) and Prettier on every supported staged file.
- **One dedicated, scope-matched issue per PR.** The PR body carries `Closes #N`; both
  issue and PR are assigned to the author (`mks-zakaria` — `auto-assign.yml` calls
  `AgriLogy/shared-workflows` to do this automatically).
- **Zero AI/assistant attribution anywhere** — no `Co-Authored-By`, no assistant mention
  in commits, PR titles/bodies, issues or branch names.
- Commit from your local machine only.

Before opening a PR:

```bash
npm run check     # lint + typecheck
npm run test
npm run build
```

CI (`.github/workflows/ci.yml`) re-runs lint, typecheck, `format:check` and build on
every PR and push to `main`; all must be green.

---

## 7. Release & deploy

| Branch / event      | What happens                                                                          |
| ------------------- | -------------------------------------------------------------------------------------- |
| PR → `main`         | `ci.yml` gate + `vercel-preview.yml` builds a **Vercel Preview** and comments the URL.  |
| Push/merge to `main`| `release.yml` runs **semantic-release**; `vercel-production.yml` deploys **production**. |

- semantic-release (`.releaserc.json`, branch `main`) bumps the root `package.json`,
  updates `CHANGELOG.md`, tags, and cuts a GitHub Release. Note the custom
  `releaseRules`: `chore`/`refactor`/`docs`/`style`/`test`/`build`/`ci` all produce a
  **patch**; `chore(release)` and any `no-release` scope produce nothing.
- Its `chore(release): X.Y.Z [skip ci]` commit is skipped by both deploy workflows, so a
  merge deploys **once** — the merged code.
- Build config: root `vercel.json` → `npx turbo run build --filter=web`, output
  `apps/web/.next`; `apps/web/vercel.json` sets `ignoreCommand: npx turbo-ignore web`
  so unrelated pushes don't rebuild. Vercel project/org IDs are inlined in the
  workflows; the only required repo secret is `VERCEL_TOKEN`.

---

## 8. Gotchas (all verified in-repo)

- **`next build` ≠ typecheck.** `ignoreBuildErrors: true` in `next.config.mjs`. Run
  `npm run typecheck`.
- **Relative API base in a production build kills the app** — see §1.
- **`PROXY_API_TARGET` must stay unset on Vercel**; the `/api-proxy` rewrite is
  local-dev only.
- **SSR-sensitive hooks**: `useIsMobile()` uses Chakra's `useBreakpointValue(..., { ssr:
  true })` on purpose — `ssr: false` reads `window` during the server render and throws.
  Don't "fix" it.
- **next-intl + Jest**: next-intl ships ESM Jest's babel transform can't parse; it is
  mocked. Keep logic pure and dependency-free if you want it tested.
- **Auth**: access token in `localStorage.accessToken`; the 401 interceptor clears the
  SSO cookie and redirects to `NEXT_PUBLIC_LOGIN_PATH`. Auth endpoints
  (`/auth/sessions`, `/auth/token`) are exempt from the redirect.
- **Vercel env vars**: production env values are set in the Vercel dashboard per project
  (Root Directory `apps/web`). Not every team member has permission to edit Production
  env vars — if a var is wrong in production, raise it rather than assuming you can
  change it. Vercel also rejects deploys authored by `mks-zakaria`, which is why
  production rides the release-bot commit / the `VERCEL_TOKEN` workflow.
- **Repo docs**: `docs/MONOREPO.md` (CI/CD + Vercel), `apps/web/docs/UI_GUIDELINES.md`
  (design system), `apps/web/docs/NOTIFICATION_ENGINE_V1.md`, `CLAUDE.md` (quick start).
- Trailing-slash behaviour of agri-api is **not documented in-repo**; mirror the exact
  path shape of the existing wrappers in `packages/api-client/src/` when adding calls.
