# Backoffice CRUD & Observability — Plan

> Status: **DRAFT — awaiting validation**
> Scope: `agri-front /admin/*` + matching `agri-api` endpoints
> Author session: 2026-05-13

---

## 1. Goal & guiding principles

The webapp side is ~done; one piece pending = **manager affirmation**
(tracked at the end of this plan, §9).

We now rebuild the **backoffice (`/admin/*`)** as a **goal-oriented
management console**: for any user we must be able to, from one place,

- see who they are, where they are, their status, payment, role
- see all their zones + parameters
- see all their graphs (which are enabled, sensor visibility)
- see their sensor data (soil + station charts)
- **modify** any user field, any zone field, any param, any unit
- **create** a new zone for them
- **delete** a zone
- **toggle** a graph
- **change a unit** on any sensor reading
- in the future, **affirm a manager request** (§9)

Two principles drive the rebuild:

1. **Norms & shared patterns.** Every backoffice page renders through
   the same shell, the same `PageInfoBar`, the same antd primitives
   (Table / Drawer / Form / Popconfirm / Space / message), the same
   axios wrappers under `src/app/lib/`. No more bespoke
   `Modal+VStack+useToast` per page.
2. **Goal-oriented pages.** Today the backoffice is split by **action**
   (`/admin/users/modify/[user]`, `/admin/zone-per-user/[user]`,
   `/admin/graph-per-user/[user]`, `/admin/users/data/soil/[user]`, …).
   We collapse this into one **user-detail console** at
   `/admin/users/[user]` with tabs, so an admin lands on a user and
   does _everything_ without page-jumping.

---

## 1.bis Cross-cutting requirements (added 2026-05-13)

Three additional bands of work that run **alongside** the feature
sprints below, not after them:

- **Backend: standards compliance.** Every new admin module follows
  the project's DRF + Django conventions; we also clean up the legacy
  bits we touch on the way.
- **Backend: unit tests.** Every new endpoint, serializer, model,
  permission, and helper ships with `pytest-django` tests under
  `analytics/tests/` or `CustomUser/tests/`, following the existing
  `test_alerts.py` / `test_agronomy.py` style. Target ≥ 90 % line
  coverage on new files; ≥ 80 % on touched legacy files.
- **Frontend: app-wide consistency sweep.** While we rebuild the
  backoffice we also normalise the rest of the app (`/soil`,
  `/station`, `/water`, `/plant`, `/vannes-pompes`, `/notifications`,
  `/settings`, `/alerts`, `/login`) so the whole product reads as one
  design system. Detail in §12.

See §6.bis for backend standards, §6.ter for the test plan, §12 for
the consistency sweep, and §8 for how these fold into the sprint order.

---

## 2. Design system rules (recap)

These are not new — they're how `/alerts`, `/notifications`,
`/settings` are already built. The backoffice has to follow them.

- **UI primitives:** **antd v6** (`Button`, `Form`, `Table`, `Drawer`,
  `Modal`, `Popconfirm`, `Space`, `Tag`, `Tabs`, `Switch`, `Select`,
  `InputNumber`, `DatePicker`). No new `@chakra-ui` `Modal`, `Select`,
  `Input`, `FormControl`, `useToast` in admin code — replace as we
  touch each file. `Box` / `Flex` / `Stack` from chakra are still fine
  as layout primitives (token-driven).
- **Feedback:** `App.useApp()` → `message.success / error / warning`
  and `modal.confirm` (never `useToast` in new code).
- **Theme tokens:** `src/app/styles/tokens/colors.ts` →
  `src/app/styles/antdTheme.ts` + `src/app/theme.ts`. Everything brand-green.
- **SCSS modules** for per-component layout
  (`*.module.scss`, e.g. `AlertMain.module.scss`) — colocated with the
  component. No more `style.module.css` shared bag.
- **Tailwind utilities** allowed for **responsive helpers only**
  (`flex md:hidden`, `grid-cols-1 md:grid-cols-2`). Not for color,
  spacing, typography — those go through tokens.
- **Shell:** `<AdminPageShell>` wraps every `/admin/*` page; first
  child is always `<PageInfoBar title=… subtitle=… actions=…>`.
- **API client:** `src/app/lib/api.ts` (axios with JWT interceptor).
  Every domain gets its own typed wrapper in `src/app/lib/<domain>Api.ts`
  (see `alertApi.ts` as the reference). No raw `axios.post` in components.
- **Loading / empty / error:** antd `Table loading=…`, `Empty`,
  `Skeleton`. Errors flow to `message.error` with the API's `detail`.

---

## 3. Information architecture — `/admin`

```
/admin                              Dashboard (KPIs + recent activity)
/admin/users                        Users list (the new ListeUsers)
/admin/users/new                    Create user (drawer or page)
/admin/users/[username]             User detail console  ← NEW
   ├─ tab: Profil                   identity, contact, location, role, payment, status
   ├─ tab: Zones                    list + create + edit + delete zones
   ├─ tab: Paramètres               per-zone params (Kc, soil TAW/FC/WP/RAW, flow rate, units)
   ├─ tab: Graphiques               per-zone active-graph toggles (current GraphStatusMain)
   ├─ tab: Données — Sol            soil sensor charts (admin-readonly)
   ├─ tab: Données — Station        weather charts (admin-readonly)
   ├─ tab: Alertes & notifs         admin view of user's alerts (read + disable)
   └─ tab: Activité                 audit log: logins, last_notified, manager actions

/admin/login                        unchanged
```

**Routes to redirect / deprecate** (keep redirects for ~1 release, then drop):

| Old route                                | Redirect to                            |
| ---------------------------------------- | -------------------------------------- |
| `/admin/users/modify/[user]`             | `/admin/users/[user]?tab=profile`      |
| `/admin/zone-per-user/[user]`            | `/admin/users/[user]?tab=zones`        |
| `/admin/graph-per-user/[user]`           | `/admin/users/[user]?tab=graphs`       |
| `/admin/users/data/soil/[user]`          | `/admin/users/[user]?tab=soil-data`    |
| `/admin/users/data/station/[user]`       | `/admin/users/[user]?tab=station-data` |
| `/admin/users/data/page.tsx` (dead stub) | delete                                 |
| `/admin/users/create` (dead create form) | `/admin/users/new`                     |

The user-detail page reads `?tab=` from the URL so deep-links + the
old redirects work.

---

## 4. Page-by-page work

### 4.1 `/admin` — dashboard

Currently renders nothing (`{null}` inside `<AdminPageShell>`). Replace
with a goal-oriented landing:

- `PageInfoBar` title=`Tableau de bord administrateur`.
- antd `Row/Col` of KPI cards (cf. `<DashboardCard>`): nb users, nb
  active users, nb staff, nb zones, alerts triggered last 24h.
- antd `Table` "Derniers utilisateurs" (latest 5 by `date_joined`) with
  a row click → `/admin/users/[username]`.
- Replace the legacy `MainAdmin.tsx` grid (Dashboard/Users/Zones/Logout
  tiles) — these become sidebar items.

Files to touch / create:

- `src/app/admin/page.tsx` — replace `{null}`.
- `src/app/components/admin/AdminDashboardMain.tsx` — new.
- Delete `src/app/components/admin/MainAdmin.tsx`.

Backend:

- `GET /api/admin/overview/` → `{ users_total, users_active, staff_total, zones_total, alerts_24h }`. New endpoint in `analytics/adminviews.py`.

### 4.2 `/admin/users` — list

Rewrite `ListeUsers.tsx` (currently Chakra `<Table>` from
`@chakra-ui/react`) to the **antd table** pattern used by
`AlertMain.tsx`:

- `PageInfoBar title="Utilisateurs" actions={<Button "Nouvel utilisateur">}`.
- antd `<Table<UserRow>>` with columns: Username, Email, Rôle (Tag),
  Statut (Tag green/red), Paiement (Tag), Zones (count), Dernière
  connexion, Actions.
- Server-side search/filter via antd `Input.Search` over the table,
  sort by username/email/created_at, page size 20.
- Row actions: `Voir` (→ `/admin/users/[username]`), `Désactiver` /
  `Réactiver`, `Supprimer` (Popconfirm, calls backend).
- Empty state: `<Empty description="Aucun utilisateur" />`.

Backend gaps to fill (see §6):

- `GET /auth/users/` already exists but must include `id, username,
email, firstname, lastname, is_active, is_staff, payement_status,
date_joined, zones_count, last_login`.
- `PATCH /auth/admin/users/<username>/activate/` toggle `is_active`.
- `DELETE /auth/admin/users/<username>/` soft-delete.

Files to touch:

- `src/app/components/admin/ListeUsers.tsx` — full rewrite.
- `src/app/lib/adminUserApi.ts` — new typed wrapper.

### 4.3 `/admin/users/new` — create

Replace `CreateUser.tsx` (Chakra) with an antd `Drawer + Form` (same
pattern as `AlertCreateDrawer`). Triggered from `/admin/users` header
button **and** from `/admin/users/new` for deep-link.

Fields: username, firstname, lastname, email, phone_number, password
(with strength hint), role (`Switch` Admin/Utilisateur), payement_status
(`Select`), latitude, longitude (+ "Remplir auto" button using
`navigator.geolocation`), allowed sensor keys (`Checkbox.Group` from
`getAllSensorsCatalog`).

Backend: existing `POST /auth/admin-signup/` already accepts these.
Adds: persist `allowed_sensor_keys` server-side (today only stored in
localStorage by `SuperAdminUsersSettings`).

Files:

- `src/app/admin/users/new/page.tsx` — new (re-exports the list with
  drawer auto-opened).
- `src/app/components/admin/UserCreateDrawer.tsx` — new.
- Delete `src/app/components/admin/CreateUser.tsx` and
  `src/app/admin/users/create/page.tsx`.

### 4.4 `/admin/users/[username]` — user detail console (the centerpiece)

Shell:

```tsx
<AdminPageShell>
  <PageInfoBar
    title={fullName ?? username}
    subtitle={<UserStatusLine ... />}    // role · payment · active · last login
    actions={<UserHeaderActions ... />}  // Désactiver / Réinitialiser MDP / Supprimer
  />
  <Tabs items={[...]} activeKey={tabFromUrl} onChange={updateUrl} />
</AdminPageShell>
```

Each tab is its own component under
`src/app/components/admin/userDetail/`:

#### a. `ProfileTab.tsx`

- antd `Form` (no submit button — debounced autosave via
  `Form.useWatch` + `PATCH`).
- Fields: firstname, lastname, email, phone_number, latitude,
  longitude (+ "Remplir auto"), role `Switch`, payement_status
  `Select` (actif / suspended), is_active `Switch`,
  `notify_every` `InputNumber`.
- Replaces `ModifyUser.tsx` (Chakra).
- Backend: `GET/PATCH /auth/admin/users/<username>/` (replaces
  `/auth/modify-user/?username=…` with proper REST).

#### b. `ZonesTab.tsx`

- antd `Table<Zone>` of the user's zones — name, surface, soil_type,
  Kc, threshold humidité, flow rate, dernière irrigation, Actions
  (Modifier/Supprimer Popconfirm).
- Header action: `Nouvelle zone` → opens `ZoneFormDrawer`.
- Replaces `ZoneMainAdmin.tsx` + `ZoneCard.tsx` +
  `ZoneEditModalAdmin.tsx` + `ZoneModalAddFormAdmin.tsx` +
  `ZoneAddFloatingButtonAdmin.tsx` (all Chakra-modal-based, with
  `window.location.reload()`).
- Backend: `GET /api/admin/users/<username>/zones/` (list),
  `POST /api/admin/users/<username>/zones/` (create),
  `GET/PUT/DELETE /api/admin/users/<username>/zones/<zoneId>/`.
  Already partially implied by the frontend (`/api/zone-per-user/…`,
  `/api/mod-zone-per-user/…`) but **the actual Django routes do not
  exist** — see §6.

#### c. `ParamsTab.tsx` (new)

- antd `Tabs` per zone (zone selector at top), one antd `Form` with:
  - Soil params: `soil_param_TAW, soil_param_FC, soil_param_WP, soil_param_RAW`
    (`InputNumber` with suffix `mm` / `%`).
  - Irrigation: `pomp_flow_rate` (L/s), `irrigation_water_quantity` (L),
    `critical_moisture_threshold` (%).
  - Kc periods: editable `Table` (one row per period — name, start, end,
    kc_value).
  - **Units**: a `Select` per sensor family ("Température en °C/°F",
    "Vent en m/s/km/h", …) sourced from each sensor's
    `available_units`. Stored server-side per-user-per-sensor (new model
    or new field on `CustomUser`).
- Backend: extends `Zone` endpoints + `PATCH /api/admin/users/<username>/sensor-units/` (new).

#### d. `GraphsTab.tsx`

- Wraps existing `GraphStatusMain` UX but **rewritten in antd**:
  zone `Select`, then antd `Card`s per group (Sol/Météo/Eau/Plante/…),
  with antd `Switch` per status field. `message.success` on save.
- Endpoint already exists: `GET/PUT /api/active-graph/<username>/<zoneId>/`.

#### e. `SoilDataTab.tsx`

- Same data as `/soil` page but in admin context. Reuse the existing
  soil chart components (`<SoilWaterGraph>`, `<SoilHumidityGraph>`,
  …). Wrap in antd `Tabs` (per zone) + `RangePicker`.
- Replace the empty stub `UserSoildata.tsx`.

#### f. `StationDataTab.tsx`

- Reuse `UserStationdata.tsx` but rewrap the header in `PageInfoBar`
  (already inside the user-detail console, so just the chart grid).
- Remove `useColorModeStyles`+`g.box` chrome, replace with
  `src/app/components/main/StationMain` cards.

#### g. `AlertsNotifsTab.tsx` (new)

- antd `Table` of `Alert` rows the user has created
  (`/api/alerts/?user=<username>` — needs backend extension).
- Read-only by default. Admin actions: disable an alert, delete a
  user alert.
- Below: latest notifications (`Notification` model) — last 10.

#### h. `ActivityTab.tsx` (new)

- Timeline (`antd <Timeline>`) — joined date, last login, last
  notified, last password reset, manager approvals received/given.
- Backed by `GET /api/admin/users/<username>/activity/`.

Files to create under `src/app/components/admin/userDetail/`:
`UserDetailShell.tsx`, `ProfileTab.tsx`, `ZonesTab.tsx`,
`ZoneFormDrawer.tsx`, `ParamsTab.tsx`, `GraphsTab.tsx`,
`SoilDataTab.tsx`, `StationDataTab.tsx`, `AlertsNotifsTab.tsx`,
`ActivityTab.tsx`, `UserStatusLine.tsx`, `UserHeaderActions.tsx`,
`UserDetailShell.module.scss`.

Page route:

- `src/app/admin/users/[username]/page.tsx` — new (uses `searchParams.tab`).

### 4.5 Sidebar & header

- `AdminSidebar.tsx` — port to antd `Menu` (vertical), with
  Tableau de bord, Utilisateurs, Paramètres, Alertes admin,
  Déconnexion. Keep the icons (`@ant-design/icons` instead of
  `react-icons/fa`).
- `AdminHeader.tsx` / `AdminBigMenu.tsx` / `AdminMobileMenu.tsx` —
  antd `Layout.Header`, brand logo, `Dropdown` for the admin's
  profile, antd color-mode `Switch`.

---

## 5. Shared admin components to introduce

Live under `src/app/components/admin/_shared/`:

- `AdminPageInfoBar` — thin wrapper over `PageInfoBar` that injects
  the admin-tab subtitle helpers.
- `AdminCrudTable` — generic typed antd Table with built-in search,
  pagination, row actions. Adopted by Users list, Zones list,
  Alerts list, Params table.
- `AdminEntityDrawer` — wraps antd `Drawer` with the standard
  Cancel/Save footer (cf. `AlertCreateDrawer`).
- `AdminConfirmDelete` — `Popconfirm` preset
  (`okText="Supprimer" danger` + `message.success/error`).
- `useAdminEntity<T>` — hook for `useEffect → api.get`, with
  loading/error states + refetch.

---

## 6. Backend work (agri-api)

The frontend today calls several endpoints **that don't exist** in
the Django URL conf. Confirmed missing (or stale):

- `POST /api/admin-user-data/` — called by `GraphStatusMain` & co.
- `GET/POST /api/zone-per-user/<username>/` — zone list + create.
- `PUT/DELETE /api/mod-zone-per-user/<username>/<zoneId>/`.

We expose a clean admin sub-tree under `/api/admin/...`. New module
`analytics/admin_urls.py` (or extend `adminviews.py`) with
`IsAdminUser`-gated endpoints:

```
GET    /api/admin/overview/                                    dashboard KPIs
GET    /auth/admin/users/                                      list (drop /auth/users for admin use)
POST   /auth/admin/users/                                      create
GET    /auth/admin/users/<username>/                           detail
PATCH  /auth/admin/users/<username>/                           partial update
DELETE /auth/admin/users/<username>/                           soft-delete
POST   /auth/admin/users/<username>/activate/                  toggle is_active
POST   /auth/admin/users/<username>/reset-password/            email reset link
GET    /api/admin/users/<username>/activity/                   timeline

GET    /api/admin/users/<username>/zones/                      list
POST   /api/admin/users/<username>/zones/                      create
GET    /api/admin/users/<username>/zones/<zone_id>/            detail
PUT    /api/admin/users/<username>/zones/<zone_id>/            update
DELETE /api/admin/users/<username>/zones/<zone_id>/            delete

GET    /api/admin/users/<username>/zones/<zone_id>/params/     soil + irrigation params
PUT    /api/admin/users/<username>/zones/<zone_id>/params/     update params
GET    /api/admin/users/<username>/zones/<zone_id>/kc/         kc periods
PUT    /api/admin/users/<username>/zones/<zone_id>/kc/         update kc periods

GET    /api/admin/users/<username>/sensor-units/               unit prefs
PATCH  /api/admin/users/<username>/sensor-units/               update unit prefs

GET    /api/admin/users/<username>/alerts/                     user's alerts
PATCH  /api/admin/alerts/<id>/                                 admin override
DELETE /api/admin/alerts/<id>/                                 admin delete
```

`POST /api/admin-user-data/` becomes
`POST /api/admin/users/<username>/sensor-data/` with
`{zone_id?, start_date, end_date}` body.

New model: `UserSensorUnitPreference(user FK, sensor_key, unit)`.

Refactor: drop `permission_classes = [AllowAny]` on `UserListView`
(security regression) — every admin route gates on
`[IsAuthenticated, IsAdminUser]`.

Serializers: split `Admin*UserSerializer` into `AdminUserListSerializer`
(card fields) and `AdminUserDetailSerializer` (everything including
`date_joined`, `last_login`, `zones_count`).

---

## 6.bis Backend standards (compliance band)

The project already pins `Django 4.2 + DRF 3.15 + simplejwt + ruff +
pytest-django`. New code follows these conventions; legacy files we
touch get brought up to spec on the way.

### Module layout

- App boundaries respected: **user identity** lives in `CustomUser/`,
  **domain** (zones, sensors, alerts, params, units, affirmations)
  lives in `analytics/`.
- One file per concern (no more 500-line `views.py`):
  `analytics/views/zones.py`, `analytics/views/admin_zones.py`,
  `analytics/views/admin_overview.py`, etc. Replace the current `from
.views import *` glob with explicit imports in `urls.py`.
- Same for serializers (`analytics/serializers/zones.py`,
  `serializers/admin_users.py`, …) and `__init__.py` re-exports the
  public surface.

### Views

- Default to `rest_framework.generics` / `ViewSet` for plain CRUD
  (`RetrieveUpdateDestroyAPIView`, `ListCreateAPIView`) — the new
  admin tree is 95 % CRUD, no reason to hand-roll `APIView.get/put`
  twelve times.
- `permission_classes = [IsAuthenticated, IsAdminUser]` on every
  `/api/admin/*` and `/auth/admin/*` view. **No `AllowAny`.**
- `lookup_field = "username"` on the user routes; `lookup_url_kwarg`
  where the URL kwarg differs.
- Custom permission `IsAdminOrSelf` for shared user routes (admin
  can act on any user, user can act on themselves only).
- Errors raise `rest_framework.exceptions.*` (`NotFound`,
  `ValidationError`, `PermissionDenied`) — never raw `Response(...,
status=400)` with stringly-typed messages. Lets DRF render
  consistent envelopes.

### Serializers

- `ModelSerializer` only; no field-by-field dict assembly.
- Explicit `fields = [...]` (never `"__all__"` on admin write paths)
  - `read_only_fields` for `id`, `date_joined`, `created_at`,
    `updated_at`, `last_triggered_at`, `last_login`.
- Validation in `validate_<field>` / `validate(self, attrs)`, not in
  the view. (E.g. unique email check today lives in
  `SignUpAPIView`; move it to `UserSerializer.validate_email`.)
- Password handling via `write_only=True` + `validate_password`
  inside `validate_password()` — the existing `AdminSignUpAPIView`
  imports `validate_password` mid-class, that gets cleaned up.

### URLs

- DRF `DefaultRouter` for ViewSets; `path(...)` only for one-offs
  (`activate`, `reset-password`, `overview`).
- Versioning prefix retained at the project level (`/api/`,
  `/auth/`); no per-app `v1`.

### Models & migrations

- New models: `Meta.ordering`, `Meta.indexes` where queried (admin
  list ordering by `-date_joined`, alerts by `-id`, sensor data by
  `-timestamp` → already indexed via FK, verify).
- `__str__` on every new model.
- Forward-only migrations, one per logical change, named
  descriptively (`00XX_add_user_sensor_unit_preference.py`,
  `00XX_add_manager_affirmation.py`).
- Soft-delete pattern: `is_active` on `CustomUser` stays the canonical
  off-switch; we do **not** introduce `deleted_at` unless §11 question 2
  demands it.

### Logging & errors

- Use `logging.getLogger(__name__)` per module; **no `print`** in new
  code. Replace `print` calls in any file we touch.
- Server-side errors `logger.exception(...)`; user-facing detail goes
  via DRF's standard error envelope.

### Lint, type, format

- `ruff check back/` clean on every commit; expand the rule set from
  the current `["F"]` to `["F", "E", "W", "I", "B", "DJ", "PT",
"RET", "SIM", "UP"]` on the new directories only (use ruff's
  `per-file-ignores` so the legacy scientific-name code stays green).
- `ruff format back/` on every commit (line-length 88 already set).
- Add `mypy` (or `pyright` lite) optional dep + `mypy.ini` covering
  the new files only — out of scope to retrofit the whole codebase.

### Settings & secrets

- No new hardcoded URLs, hosts, keys. Anything env-driven goes
  through `django-environ` (already imported in `agriBack/settings.py`).
- `back/.env` is missing (per memory: `[[project_backend_bootstrap]]`)
  — sprint 1 also lays down `env-example` parity for the admin
  endpoints (e.g. `ADMIN_PASSWORD_RESET_TTL_HOURS`).

### Security checklist (per endpoint)

- `permission_classes` correct.
- `request.user` ownership enforced where applicable.
- No leaking another user's data in error messages.
- Mass-assignment closed via explicit serializer `fields`.
- Throttling on `reset-password` (`rest_framework.throttling.UserRateThrottle`).
- `last_login` updated on `signin` (today's `SignInAPIView` doesn't).

### Documentation

- `drf-yasg` is already wired (`drf_yasg` in deps). Every new
  endpoint declares `swagger_auto_schema` (or `extend_schema`) so
  `/swagger/` and `/redoc/` are accurate for admin frontend devs.

---

## 6.ter Backend unit tests (test plan)

`pytest-django` is already the runner (`pyproject.toml § [tool.pytest.ini_options]`).
Reference style: `analytics/tests/test_alerts.py` (`TestCase` +
`APIClient`, `reverse('view-name')`, factory helpers,
multi-user isolation).

### Directory & file map (new)

```
back/
├── CustomUser/
│   └── tests/
│       ├── __init__.py
│       ├── conftest.py                 # admin_user / normal_user / api_client fixtures
│       ├── test_admin_user_list.py     # GET /auth/admin/users/
│       ├── test_admin_user_detail.py   # GET/PATCH/DELETE /auth/admin/users/<u>/
│       ├── test_admin_user_create.py   # POST /auth/admin/users/
│       ├── test_admin_user_activate.py # POST .../activate/
│       ├── test_admin_user_reset_pw.py # POST .../reset-password/
│       └── test_permissions.py         # IsAdminUser / IsAdminOrSelf
├── analytics/
│   └── tests/
│       ├── test_admin_overview.py
│       ├── test_admin_zones.py         # full CRUD
│       ├── test_admin_zone_params.py
│       ├── test_admin_kc_periods.py
│       ├── test_admin_sensor_units.py
│       ├── test_admin_sensor_data.py
│       ├── test_admin_alerts_override.py
│       ├── test_admin_user_activity.py
│       └── test_manager_affirmation.py # §9
```

### What each suite must cover (the "norms" tests)

For every endpoint:

1. **Happy path** — admin call returns 200/201 with the documented
   shape (assert keys, types).
2. **Auth** — anonymous → 401.
3. **Permissions** — non-admin authenticated → 403.
4. **Ownership / cross-user isolation** — admin acting on user A
   does not leak user B's data.
5. **Validation** — missing required field → 400 with the offending
   field name in the error envelope.
6. **Not-found** — bad `username` / `zone_id` → 404 (not 500).
7. **Idempotency** where applicable (activate twice = noop).
8. **DB side effects** — `assertEqual(qs.count(), N)` after mutations.

### Unit-level coverage (not just HTTP)

- **Serializers.** Test `validate_*` raises `ValidationError` for
  every guard (unique email, strong password, lat ∈ [-90, 90],
  lon ∈ [-180, 180], non-negative space/kc, threshold ∈ [0, 100]).
- **Permissions.** `IsAdminOrSelf` table-driven test:
  (admin → any user) ✓, (user → self) ✓, (user → other) ✗,
  (anonymous) ✗.
- **Model methods.** `__str__`, any computed property
  (`zones_count`, `last_irrigation_date`), default factories.
- **Helpers.** `password_reset_email_text(user)`, geo validators,
  sensor-unit normalizers.

### Coverage targets

- New files: **≥ 90 % lines, ≥ 85 % branches.**
- Legacy files we touch (e.g. `CustomUser/views.py`): **≥ 80 %**
  after refactor.
- CI fails below threshold. Add `coverage` + `pytest-cov` to
  `[dependency-groups].dev`; new `make test` and `make test-cov`
  targets in the `Makefile`.

### Fixtures (shared)

`CustomUser/tests/conftest.py` and `analytics/tests/conftest.py`:

```python
@pytest.fixture
def admin_user(db): ...
@pytest.fixture
def normal_user(db): ...
@pytest.fixture
def other_user(db): ...
@pytest.fixture
def admin_client(admin_user): ...
@pytest.fixture
def user_client(normal_user): ...
@pytest.fixture
def zone_factory(db): ...  # creates Zone for a given user
@pytest.fixture
def alert_factory(db): ...
```

`zone_factory` / `alert_factory` use `factory_boy` (add to dev deps)
so each test composes the world it needs without 30-line setups.

### CI

- New GitHub Actions job (or extend existing) running
  `uv run pytest --cov=CustomUser --cov=analytics --cov-fail-under=85`.
- Lint job: `ruff check back/ && ruff format --check back/`.

### Definition of done (testing band)

- Every endpoint in §6 has a green test file.
- `make test` runs clean locally in < 60 s.
- Coverage report committed to PR description.
- No skipped tests left in `main`.

---

## 7. File-by-file change list

Frontend (delete unless noted):

- delete: `src/app/admin/users/create/page.tsx`
- delete: `src/app/admin/users/modify/[user]/page.tsx`
- delete: `src/app/admin/users/data/page.tsx`
- delete: `src/app/admin/users/data/soil/[user]/page.tsx`
- delete: `src/app/admin/users/data/station/[user]/page.tsx`
- delete: `src/app/admin/graph-per-user/[user]/page.tsx`
- delete: `src/app/admin/zone-per-user/[user]/page.tsx`
- delete: `src/app/components/admin/CreateUser.tsx`
- delete: `src/app/components/admin/ModifyUser.tsx`
- delete: `src/app/components/admin/MainAdmin.tsx`
- delete: `src/app/components/admin/GraphStatusMain.tsx`
- delete: `src/app/components/admin/UserSoildata.tsx`
- delete: `src/app/components/admin/UserStationdata.tsx`
- delete: `src/app/components/admin/ZoneMainAdmin.tsx`
- delete: `src/app/components/admin/ZoneCard.tsx`
- delete: `src/app/components/admin/ZoneEditModalAdmin.tsx`
- delete: `src/app/components/admin/ZoneModalAddFormAdmin.tsx`
- delete: `src/app/components/admin/ZoneAddFloatingButtonAdmin.tsx`
- delete: `src/app/components/admin/AddZoneFloatingButton.tsx`
- delete: `src/app/components/admin/AdminDateRangePicker.tsx` (replaced
  by shared antd RangePicker pattern)
- delete: `src/app/components/admin/style.module.css`
- delete: `src/app/components/admin/FloatingButton.tsx`

- rewrite: `src/app/admin/page.tsx`
- rewrite: `src/app/admin/users/page.tsx`
- rewrite: `src/app/components/admin/ListeUsers.tsx` → renamed
  `AdminUserListMain.tsx`
- rewrite: `src/app/components/main/AdminSidebar.tsx`
- rewrite: `src/app/components/main/AdminHeader.tsx` (+ Big/Mobile)
- rewrite: `src/app/components/layout/AdminPageShell.tsx` (keep API,
  swap palette to antd-friendly tokens)

- new: `src/app/admin/users/[username]/page.tsx`
- new: `src/app/admin/users/new/page.tsx`
- new: `src/app/components/admin/AdminDashboardMain.tsx`
- new: `src/app/components/admin/userDetail/UserDetailShell.tsx`
- new: `src/app/components/admin/userDetail/ProfileTab.tsx`
- new: `src/app/components/admin/userDetail/ZonesTab.tsx`
- new: `src/app/components/admin/userDetail/ZoneFormDrawer.tsx`
- new: `src/app/components/admin/userDetail/ParamsTab.tsx`
- new: `src/app/components/admin/userDetail/GraphsTab.tsx`
- new: `src/app/components/admin/userDetail/SoilDataTab.tsx`
- new: `src/app/components/admin/userDetail/StationDataTab.tsx`
- new: `src/app/components/admin/userDetail/AlertsNotifsTab.tsx`
- new: `src/app/components/admin/userDetail/ActivityTab.tsx`
- new: `src/app/components/admin/userDetail/UserStatusLine.tsx`
- new: `src/app/components/admin/userDetail/UserHeaderActions.tsx`
- new: `src/app/components/admin/userDetail/UserDetailShell.module.scss`
- new: `src/app/components/admin/_shared/AdminCrudTable.tsx`
- new: `src/app/components/admin/_shared/AdminEntityDrawer.tsx`
- new: `src/app/components/admin/_shared/AdminConfirmDelete.tsx`
- new: `src/app/components/admin/_shared/useAdminEntity.ts`
- new: `src/app/lib/adminUserApi.ts`
- new: `src/app/lib/adminZoneApi.ts`
- new: `src/app/lib/adminAlertApi.ts`
- new: `src/app/lib/adminSensorUnitsApi.ts`
- new: `src/app/components/admin/UserCreateDrawer.tsx`

Backend:

- new: `analytics/admin_urls.py` (or extend the existing one)
- extend: `analytics/adminviews.py` — `AdminOverview`, `AdminZone*`,
  `AdminZoneParams`, `AdminUserActivity`, `AdminUserSensorData`,
  `AdminUserSensorUnits`, `AdminAlerts*`.
- new: `CustomUser/admin_views.py` — `AdminUserList`,
  `AdminUserDetail` (RUD), `AdminUserActivate`,
  `AdminUserResetPassword`.
- new model: `analytics/models.py::UserSensorUnitPreference`.
- migration: `analytics/migrations/00XX_user_sensor_unit_preference.py`.
- harden: gate `UserListView` behind `IsAdminUser`.

---

## 8. Execution order (sprints)

We do this in topologically-sound chunks. Each chunk is shippable and
testable on its own.

1. **Shared scaffolding (frontend)**
   - `_shared/AdminCrudTable`, `AdminEntityDrawer`,
     `AdminConfirmDelete`, `useAdminEntity`
   - `adminUserApi`, `adminZoneApi`
   - Rewrite `AdminSidebar` + `AdminHeader` to antd
   - Smoke: existing pages still render (they consume nothing new yet)

2. **Backend admin user CRUD + admin zone CRUD**
   - `/auth/admin/users/*` + `/api/admin/users/<u>/zones/*`
   - Gate old `UserListView` behind admin
   - Add `zones_count`, `last_login`, `date_joined` to list serializer

3. **`/admin/users` list rewrite**
   - antd table, search/filter/sort, row → user detail link
   - delete `ListeUsers.tsx` (Chakra version)

4. **`/admin/users/new` drawer**
   - antd `UserCreateDrawer` mounted from list header button
   - delete `CreateUser.tsx`

5. **User detail console — Profil + Zones tabs**
   - `/admin/users/[username]?tab=profile`
   - `ProfileTab` (antd Form, autosave)
   - `ZonesTab` + `ZoneFormDrawer` (list/create/edit/delete)
   - Redirects from `/admin/users/modify/[user]` and
     `/admin/zone-per-user/[user]`

6. **User detail console — Graphiques + Paramètres tabs**
   - `GraphsTab` (replaces `GraphStatusMain`, antd Switch+Card)
   - `ParamsTab` (Kc periods table, soil params form, units selectors)
   - Backend `Zone` params endpoints + `UserSensorUnitPreference`
   - Redirects from `/admin/graph-per-user/[user]`

7. **User detail console — Données Sol + Station tabs**
   - Reuse existing chart components, wrap in antd Tabs +
     shared RangePicker
   - Backend `POST /api/admin/users/<u>/sensor-data/`
   - Redirects from `/admin/users/data/soil|station/[user]`

8. **User detail console — Alertes & Notifs + Activité tabs**
   - `AlertsNotifsTab` + admin override endpoints
   - `ActivityTab` + activity endpoint

9. **Dashboard /admin landing**
   - KPIs + recent users table

10. **Manager affirmation feature (§9)** — webapp piece + backoffice piece.

11. **Sweep**: delete redirect shims, drop unused Chakra deps from
    admin code, prune `style.module.css`.

12. **Frontend consistency sweep** (see §12) — runs in parallel from
    sprint 3 onwards, lands fully before sprint 11.

13. **Tests**: jest behaviour tests for `adminUserApi`,
    `AdminCrudTable`, `ZoneFormDrawer`. Smoke Playwright walkthrough
    `/admin → users → detail → edit profile → add zone → toggle graph`.
    On backend side, every sprint that introduces an endpoint also
    introduces its test file per §6.ter — sprints don't ship without
    their tests.

---

## 9. Manager affirmation (the remaining webapp piece)

Cross-references both sides, parked here so it ships with the
backoffice work.

- **Webapp:** when a non-admin user performs a flagged action (e.g.
  changing irrigation params or accepting an alert action), an
  affirmation request is created. The user sees a pending banner
  ("En attente de validation par le manager").
- **Backoffice:** on the user-detail console, an `AlertsNotifsTab`
  sub-section (or its own `AffirmationsTab`) lists pending requests
  per user; the admin can approve / reject (Popconfirm).
- **Model:** new `ManagerAffirmation(requested_by FK, action,
payload JSON, status, decided_by FK, decided_at, decision_note)`.
- **Endpoints:** `POST /api/manager-affirmations/` (user creates),
  `GET /api/manager-affirmations/?status=pending`,
  `POST /api/manager-affirmations/<id>/approve|reject/` (admin).
- **UI primitive:** antd `Steps` + `Tag` for status, `Popconfirm` for
  the admin decision.

Spec'ing this fully is its own sub-plan we draft before sprint 10
lands.

---

## 9.bis File-by-file backend additions (alongside §7)

Backend new/touched files (full list, complements §7):

- new: `back/CustomUser/admin_views.py`
- new: `back/CustomUser/admin_serializers.py`
- new: `back/CustomUser/admin_urls.py`
- new: `back/CustomUser/permissions.py` (`IsAdminOrSelf`)
- split: `back/analytics/views.py` → `back/analytics/views/` package
- split: `back/analytics/serializers.py` → `serializers/` package
- new: `back/analytics/views/admin_overview.py`
- new: `back/analytics/views/admin_zones.py`
- new: `back/analytics/views/admin_zone_params.py`
- new: `back/analytics/views/admin_sensor_units.py`
- new: `back/analytics/views/admin_sensor_data.py`
- new: `back/analytics/views/admin_alerts.py`
- new: `back/analytics/views/admin_activity.py`
- new: `back/analytics/views/manager_affirmation.py`
- new: `back/analytics/admin_urls.py`
- new model: `back/analytics/models/user_sensor_unit_preference.py`
- new model: `back/analytics/models/manager_affirmation.py`
- migrations: `00XX_user_sensor_unit_preference`,
  `00XX_manager_affirmation`, plus the legacy `models.py → models/`
  package move.
- harden: `back/CustomUser/views.py::UserListView` (drop `AllowAny`).
- harden: `back/CustomUser/views.py::SignInAPIView` (update `last_login`).
- new tests (full list in §6.ter).
- new: `back/Makefile` targets `test`, `test-cov`, `lint`, `format`.

---

## 10. Acceptance criteria (when do we call this done)

- An admin can land on `/admin`, click a user, and from that one URL:
  edit any profile field, see/add/edit/delete any zone, change any
  soil/irrigation param, change a unit, toggle any graph, see soil
  charts, see station charts, see and disable any alert — without
  leaving the user-detail console.
- Every backoffice page renders via `AdminPageShell + PageInfoBar`,
  uses antd primitives, and reports feedback via `App.useApp().message`.
- No `useToast`, no `<Modal>` from `@chakra-ui/react`, no `<Select>`
  from `@chakra-ui/react`, no `<FormControl>` from `@chakra-ui/react`
  anywhere under `src/app/admin/` or `src/app/components/admin/`.
- No `window.location.reload()` after a mutation — local state
  updates only.
- All admin endpoints gated by `[IsAuthenticated, IsAdminUser]`; no
  `AllowAny`.
- `npm run check && npm run test:jest` green.
- `uv run pytest --cov=CustomUser --cov=analytics --cov-fail-under=85`
  green; `ruff check back/` and `ruff format --check back/` clean.
- Every backend endpoint listed in §6 has a behaviour test covering
  the eight cases listed in §6.ter.
- Manager-affirmation workflow demoable on both sides.
- Frontend consistency sweep (§12) acceptance items met: zero
  Chakra `<Modal>`, `<Select>`, `<FormControl>`, `useToast` left
  in `src/app/`; zero `window.location.reload()` after mutations;
  every page renders through `AppPageShell` / `AdminPageShell` +
  `PageInfoBar`.

---

## 11. Open questions — resolved defaults (locked 2026-05-13)

User greenlighted without answering, so I proceed with these defaults.
Easy to revisit when they test the build.

1. **Tabs vs nested routes** → URL `?tab=…` search-param.
2. **Soft-delete vs hard-delete** → keep `is_active=false` as the
   off-switch; no `deleted_at` column for now.
3. **Per-user sensor unit prefs** → server-side
   (`UserSensorUnitPreference` model) so they're consistent across
   devices; the localStorage path stays as a fallback only.
4. **Manager affirmation actions** → start with irrigation param
   changes (Kc periods, soil params, flow rate) and user reactivation;
   `payload` is a JSON field so new action types add without a
   migration.
5. **Dashboard KPIs** → users_total, users_active, staff_total,
   zones_total, alerts_24h. Easy to grow.

---

## 12. Frontend consistency sweep (app-wide)

Done in parallel with the backoffice work. Goal: the whole app reads
as one design system.

### 12.a Inventory (what's drifted today)

- `useToast` (Chakra) still imported in `CreateUser.tsx`,
  `ModifyUser.tsx`, `GraphStatusMain.tsx`, `ZoneEditModalAdmin.tsx`,
  `ZoneModalAddFormAdmin.tsx`, `SuperAdminUsersSettings.tsx`,
  `notifications/*`, `vannes-pompes/*`. Replace with
  `App.useApp().message`.
- Chakra `Modal*` in `ZoneEditModalAdmin`, `ZoneModalAddFormAdmin`,
  `ZoneAddFloatingButtonAdmin`, `AdminSidebar` (logout confirm).
  Replace with antd `Drawer` (forms) or `Modal.confirm` (confirms).
- Chakra `Select`, `FormControl`, `FormLabel`, `Input` in the same
  admin files + `SuperAdminUsersSettings`. Replace with antd `Form`
  - `Select` + `Input` + `InputNumber`.
- Page chrome differs across routes:
  - some pages have a Chakra `<Box><Text>…</Text></Box>` header
    (admin pages)
  - some use `PageInfoBar` (alerts, settings)
  - some use `DashboardHeader` (soil/station/water/plant) — kept
    because it carries the date range + zone select, but its props
    are unified to mirror `PageInfoBar`
    Normalise so every page renders `PageInfoBar` (or its
    `DashboardHeader` extension) as the first child of the shell.
- Inconsistent feedback patterns:
  `window.location.reload()` after mutations in
  `ZoneEditModalAdmin`, `ZoneModalAddFormAdmin`, and a few notif
  flows. Replace with local-state updates + `message.success`.
- Mixed icon families: `react-icons/fa` in `AdminSidebar`,
  `AdminBigMenu`, `MainAdmin`, etc.; `@ant-design/icons` elsewhere.
  Standardise on `@ant-design/icons` (already a dep), drop
  `react-icons/fa` where touched. (Don't bulk-replace mid-feature —
  per file as we touch it.)
- Inconsistent loading states: Chakra `<Spinner>` vs antd `Spin` vs
  custom `LoadingLeaf`. Rule: antd `Spin` inside antd containers
  (Table, Drawer, Form); `LoadingLeaf` reserved for full-page
  loads.
- Empty states: mix of `<EmptyBox>`, antd `<Empty>`, ad-hoc text.
  Rule: antd `<Empty>` everywhere; `<EmptyBox>` deleted.
- Toast / message text: lowercase French, no trailing period for
  short toasts ("Zone supprimée"), period only on multi-clause
  ("Échec de la suppression. Réessayez plus tard.").

### 12.b Sweep rules (codified)

These rules go into a short `docs/UI_GUIDELINES.md` (one file,
~80 lines) so future code stays consistent:

- One UI library: **antd** for primitives, Chakra `Box/Flex/Stack/Grid`
  for layout only, tokens from `src/app/styles/tokens/colors.ts`.
- One feedback path: `App.useApp().message` / `App.useApp().modal`.
  No `useToast`.
- One mutation pattern: `await api… → message.success → local setState
→ optional refetch`. No `window.location.reload`.
- One page header: `PageInfoBar` (or `DashboardHeader` for routes that
  need date+zone). Title + subtitle + actions slot.
- One icon set: `@ant-design/icons`.
- One loading primitive (per context): antd `Spin` for containers,
  `LoadingLeaf` for full-page hydration.
- One empty primitive: antd `Empty`.
- One form pattern: antd `Form` + `Form.Item` + validation rules;
  submit via `form.submit()` from the drawer/page footer.
- Color: never hardcode hex in components; reach for the tokens
  (`brand.500`, `app.surface`, `app.border`, `app.text.muted`).
- Responsive: Tailwind utility classes for breakpoints only
  (e.g. `flex md:flex-row flex-col gap-2 md:gap-4`). Layout tokens
  stay in chakra `Stack` / `Flex` for now.
- File names: components `PascalCase.tsx`, SCSS module colocated as
  `PascalCase.module.scss`. No more `style.module.css` shared bag.
- Folder boundaries: `/admin` features → `src/app/components/admin/`,
  shared cross-page → `src/app/components/common/`, primitives in
  `src/app/components/_shared/` (new).

### 12.c Per-page consistency pass

For each page below the action is: enforce 12.b rules; nothing
functional changes unless mentioned.

- `/` (home) — confirm `PageInfoBar`; remove any stray `react-icons`.
- `/soil`, `/station`, `/water`, `/plant` — `DashboardHeader` already
  unified per `CONTINUE.md`; verify date-range presets are the antd
  set; remove leftover `useToast` callsites.
- `/vannes-pompes` — already migrated per `CONTINUE.md`; spot-check
  for `useToast` / `window.location.reload`.
- `/notifications` — verify `ZoneNotificationConfigureModal` is the
  single edit path; replace any remaining Chakra modal.
- `/alerts` — reference implementation; no changes.
- `/settings` — keep tabbed layout; replace the `<chakra.select>` in
  `SuperAdminUsersSettings` with antd `Select`; convert role
  toggle to antd `Switch`.
- `/login`, `/admin/login` — already antd per `LoginCard`; no-op.
- `/admin/*` — covered by §4.

### 12.d Cleanup (last sprint)

- Delete `src/app/components/admin/style.module.css`.
- Delete `src/app/components/admin/FloatingButton.tsx`,
  `AddZoneFloatingButton.tsx`.
- Delete `EmptyBox.tsx` (replaced by antd `Empty`).
- Drop `react-icons` from `package.json` if zero callsites remain
  after the sweep (verify with `grep`).
- Don't drop Chakra yet — it's still load-bearing for layout
  (`Box/Flex/Stack/Grid`) and for `useColorModeStyles`. Removing
  Chakra is a separate, post-this-plan project.

---

## 13. Operational constraints (locked 2026-05-13)

User-imposed constraints for this run:

- **No docker.** All validation is **static**:
  - Backend: `ruff check back/`, `ruff format --check back/`,
    `python manage.py check`, `python manage.py makemigrations --check
--dry-run`, `pytest` (in-memory SQLite — already configured via
    `USE_POSTGRES=False`, no Postgres container needed).
  - Frontend: `npm run check` (tsc + eslint + prettier — whatever
    `package.json` already runs), `npm run test:jest`,
    `tsc --noEmit`, `next build --dry-run` if available, otherwise
    `next build` without starting the dev server.
- **No push to remote.** Commits stay local. User tests with docker
  when they get home; only then do PRs open.
- **No remote agents, no `gh pr create`.** I commit on a feature
  branch and stop.
- Per-memory: **no `Co-Authored-By: Claude` trailer** on commits.

Once these are all green locally, I report back with the branch name
and the test transcript. Then the user takes over with docker.

---

## 14. Go signal

User greenlit at 2026-05-13. Execution starts at sprint 8.1
(shared scaffolding) and proceeds through 13 without further
check-ins, per the original brief ("never stop until u finish
everything").
