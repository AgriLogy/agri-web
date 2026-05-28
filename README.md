# Agrilogy

Agrilogy is an agriculture-automation platform that helps farms optimize
irrigation, monitor crops and stations, and manage water/sensor infrastructure
through a unified dashboard.

This repository contains the **frontend** application, built with
[Next.js](https://nextjs.org) (App Router) and [Chakra UI](https://chakra-ui.com).

---

## Table of contents

- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Project scripts](#project-scripts)
- [Project structure](#project-structure)
- [Contributing](#contributing)
  - [Branching](#branching)
  - [Linting & formatting](#linting--formatting)
  - [Type checking](#type-checking)
  - [Tests](#tests)
  - [Commit message format](#commit-message-format)
  - [Pull requests](#pull-requests)
- [Releases & versioning](#releases--versioning)
- [Deployment](#deployment)
- [References](#references)

---

## Tech stack

| Layer         | Tech                                                                                                                   |
| ------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Framework     | [Next.js 16](https://nextjs.org/docs) (App Router, Turbopack)                                                          |
| UI            | [Chakra UI](https://chakra-ui.com), [Emotion](https://emotion.sh)                                                      |
| Language      | [TypeScript](https://www.typescriptlang.org) (strict mode)                                                             |
| Charts & maps | [Recharts](https://recharts.org), [Mapbox GL](https://docs.mapbox.com/mapbox-gl-js/), [Leaflet](https://leafletjs.com) |
| Tooling       | ESLint, Prettier, Husky, lint-staged, commitlint, semantic-release                                                     |
| CI            | GitHub Actions                                                                                                         |

---

## Getting started

### Prerequisites

- Node.js **20+** (matches CI)
- npm **10+**

### Install & run

```bash
git clone git@github.com:mks-zakaria/agri-front.git
cd agri-front
npm install
cp env-example .env.local   # then edit values
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The dev server uses Next.js with Turbopack — pages auto-reload on save.

---

## Project scripts

| Command                | What it does                                                        |
| ---------------------- | ------------------------------------------------------------------- |
| `npm run dev`          | Start the local dev server                                          |
| `npm run build`        | Production build (`next build`, also runs TypeScript)               |
| `npm run start`        | Run the built app                                                   |
| `npm run lint`         | Run ESLint on the whole project                                     |
| `npm run lint:fix`     | Run ESLint and auto-fix what it can                                 |
| `npm run typecheck`    | Run TypeScript without emitting (`tsc --noEmit`)                    |
| `npm run format`       | Format every file with Prettier                                     |
| `npm run format:check` | Check formatting without writing                                    |
| `npm run check`        | Run **lint + typecheck + format:check** (the full local gate)       |
| `npm run test`         | Currently aliases `check` (no unit tests yet — see [Tests](#tests)) |

---

## Project structure

```
src/app/
├── components/        # Reusable UI components (Chakra-based)
├── hooks/             # Shared React hooks
├── lib/               # API clients, business logic, helpers
├── utils/             # Pure utilities (no React)
├── styles/            # Global CSS modules and theme tokens
├── types.ts           # Shared TypeScript types
├── error.tsx          # Route-level error boundary
├── global-error.tsx   # Top-level error boundary
├── not-found.tsx      # 404 page
└── <route>/page.tsx   # App-router pages
```

Key files at the repo root:

| File                    | Purpose                                            |
| ----------------------- | -------------------------------------------------- |
| `eslint.config.mjs`     | ESLint flat config (Next.js + TS + Prettier)       |
| `.prettierrc`           | Prettier formatting rules                          |
| `commitlint.config.cjs` | Conventional Commits enforcement                   |
| `.releaserc.json`       | semantic-release configuration                     |
| `.husky/`               | Git hooks (`pre-commit`, `commit-msg`, `pre-push`) |
| `.github/workflows/`    | CI and release pipelines                           |

---

## Contributing

We use a small set of automated gates so the `main` branch is always green and
releasable. **Most rules are enforced by Git hooks** — you don't need to
remember them, just keep working and the hooks will tell you when something is
off.

### Branching

- `main` is the protected, always-deployable branch.
- Work happens on short-lived feature branches: `feat/<topic>`, `fix/<topic>`, `chore/<topic>`.
- Open a pull request from your branch to `main` — never push directly to `main`.

### Linting & formatting

We use:

- [**ESLint**](https://eslint.org) with the [Next.js core-web-vitals + TypeScript](https://nextjs.org/docs/app/api-reference/config/eslint) presets, plus a few project rules in `eslint.config.mjs`.
- [**Prettier**](https://prettier.io) for formatting (rules in `.prettierrc`).
- [**lint-staged**](https://github.com/lint-staged/lint-staged) so the pre-commit hook only checks files you actually changed.

```bash
npm run lint          # show all violations
npm run lint:fix      # auto-fix what's safe
npm run format        # rewrite all files with Prettier
```

The `pre-commit` Husky hook runs `lint-staged` automatically: it
auto-fixes the staged files and aborts the commit if anything cannot be
fixed.

> Don't bypass hooks with `--no-verify`. If a hook is wrong, fix the rule
> or the file — don't skip the gate.

### Type checking

The project uses `strict: true` in `tsconfig.json`. Run:

```bash
npm run typecheck
```

This is also run by the `pre-push` hook and by CI.

### Tests

There is **no unit-test suite yet** — `npm run test` currently aliases
`npm run check` (lint + typecheck + format) so CI still has a `test` target.
When you add tests, please:

- Place them next to the code under test as `*.test.ts(x)` or in `__tests__/`.
- Use a single, agreed framework — [Vitest](https://vitest.dev) is recommended
  for the App Router. (If/when this is added, the `test` script will be
  switched to it.)
- Cover the **business logic** in `src/app/lib/` and `src/app/utils/` first;
  UI components can rely on visual review until [Playwright](https://playwright.dev)
  is set up for end-to-end tests.

Manual UI checks for any frontend change:

1. Run `npm run dev`.
2. Click through the affected page **and** at least one neighboring page.
3. Verify dark/light mode if your change touches styling.

### Commit message format

We follow [**Conventional Commits 1.0.0**](https://www.conventionalcommits.org/en/v1.0.0/),
enforced by [commitlint](https://commitlint.js.org) via the `commit-msg` Git hook.

```
<type>(<optional-scope>): <subject>

<optional body — wrap at ~72 chars, explain WHY>

<optional footer — e.g. "BREAKING CHANGE: …", "Refs #123">
```

Allowed types (defined in `commitlint.config.cjs`):

| Type       | When to use it                                          | Triggers a release?                 |
| ---------- | ------------------------------------------------------- | ----------------------------------- |
| `feat`     | A new user-facing feature                               | **Minor** bump (e.g. 1.2.0 → 1.3.0) |
| `fix`      | A user-facing bug fix                                   | **Patch** bump (1.2.0 → 1.2.1)      |
| `perf`     | A change that improves performance                      | Patch                               |
| `refactor` | Code change that neither fixes a bug nor adds a feature | No release                          |
| `docs`     | Documentation only                                      | No release                          |
| `style`    | Formatting, whitespace (not CSS)                        | No release                          |
| `test`     | Adding or fixing tests                                  | No release                          |
| `build`    | Build system / dependency changes                       | No release                          |
| `ci`       | CI configuration changes                                | No release                          |
| `chore`    | Maintenance, tooling                                    | No release                          |
| `revert`   | Reverting a previous commit                             | Depends                             |

Append `!` after the type or include `BREAKING CHANGE:` in the footer to
trigger a **major** version bump.

**Examples:**

```
feat(map): add zoom-to-zone control on the dashboard map
fix(notifications): correct bell badge count after marking as read
refactor(lib): extract date-range parsing to a pure helper
chore(deps): bump next from 16.1.6 to 16.2.1
feat(api)!: drop legacy /v1/sensors endpoint

BREAKING CHANGE: clients must migrate to /v2/sensors.
```

Useful references:

- [Conventional Commits spec](https://www.conventionalcommits.org/en/v1.0.0/)
- [How Angular structures commit messages](https://github.com/angular/angular/blob/main/CONTRIBUTING.md#commit) (the original inspiration)
- [Why semantic commits](https://semver.org) (Semantic Versioning, which our releases follow)

### Pull requests

Before opening a PR:

```bash
npm run check    # lint + typecheck + format
npm run build    # production build
```

The `pre-push` Husky hook runs the same gates, so a clean `git push` means
your PR will not fail CI for those reasons.

PR checklist:

- [ ] Branch is up-to-date with `main`.
- [ ] All commits follow Conventional Commits.
- [ ] `npm run check` and `npm run build` pass locally.
- [ ] UI changes have been manually verified in the browser.
- [ ] Description explains **what** changed and **why** (link issues if any).

CI (`.github/workflows/ci.yml`) re-runs `lint`, `typecheck`, `format:check`,
and `build` on every PR — these must be green to merge.

---

## Releases & versioning

Releases are fully automated by [**semantic-release**](https://semantic-release.gitbook.io/semantic-release/)
on every push to `main`:

1. CI runs the full check suite and a production build.
2. semantic-release inspects commits since the last tag.
3. Based on the [Conventional Commits](https://www.conventionalcommits.org)
   in that range, it determines the next [SemVer](https://semver.org)
   version (`patch` / `minor` / `major`).
4. It then:
   - bumps `package.json`,
   - updates `CHANGELOG.md`,
   - creates a Git tag (e.g. `v1.4.0`),
   - publishes a [GitHub Release](https://docs.github.com/en/repositories/releasing-projects-on-github),
   - pushes a `chore(release): X.Y.Z [skip ci]` commit back to `main`.

The `[skip ci]` marker prevents the release commit from re-triggering CI
or Vercel deployments. The original deployment was triggered by the
feature commit that landed on `main`.

You don't have to do anything to cut a release — just merge a PR with a
`feat:` or `fix:` commit and it will ship.

---

## Deployment

The app is deployed to [**Vercel**](https://vercel.com), which watches
the GitHub repository:

- **Production:** every push to `main` triggers a production deployment.
- **Preview:** every PR gets a unique preview URL.
- The container build is also defined in `Dockerfile` + `docker-compose.yml`
  for self-hosted deployments behind `nginx.conf`.

Environment variables are listed in [`env-example`](./env-example). Set them
in the Vercel dashboard for the corresponding environment.

---

## References

- [Next.js Documentation](https://nextjs.org/docs)
- [Chakra UI Documentation](https://chakra-ui.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/)
- [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html)
- [semantic-release docs](https://semantic-release.gitbook.io/semantic-release/)
- [commitlint](https://commitlint.js.org)
- [ESLint flat config](https://eslint.org/docs/latest/use/configure/configuration-files)
- [Prettier](https://prettier.io/docs/en/index.html)
- [Husky](https://typicode.github.io/husky/) and [lint-staged](https://github.com/lint-staged/lint-staged)
