# UI guidelines — frontend

> Single source of truth for the design-system rules. Every new
> component is held to these.

## Libraries

- **antd v6** for primitives: `Button`, `Form`, `Input`, `Select`,
  `Switch`, `InputNumber`, `Table`, `Drawer`, `Modal`, `Popconfirm`,
  `Tabs`, `Tag`, `Space`, `Empty`, `Skeleton`, `Timeline`.
- **Chakra UI** for **layout only**: `Box`, `Flex`, `Stack`, `Grid`,
  `GridItem`, plus `useColorMode` / `useColorModeStyles` until the
  Chakra → CSS-tokens migration lands.
- **Tailwind** for **responsive utility classes only**
  (`flex md:flex-row gap-2 md:gap-4`). Not for color, typography,
  or spacing.
- **SCSS modules** colocated with the component for layout that
  doesn't map onto Chakra props (`Foo.module.scss`).

Never introduce:

- Chakra `Modal*`, `Select`, `FormControl`, `FormLabel`, `Input`,
  `useToast`, `AlertDialog*`, `Drawer*`.
- `react-icons/*` — use `@ant-design/icons`.
- New global stylesheets or `style.module.css` shared bags.

## Page anatomy

Every page is:

```tsx
<AppPageShell>          // or AdminPageShell for /admin/*
  <PageInfoBar
    title="…"
    subtitle={…}
    actions={…}
  />
  <Box bg="app.surface" borderWidth="1px" borderColor="app.border"
       borderRadius="lg" px={{ base: 3, md: 4 }} py={{ base: 3, md: 4 }}>
    {…content…}
  </Box>
</AppPageShell>
```

Dashboards (`/soil`, `/station`, `/water`, `/plant`) keep
`<DashboardHeader>` because it carries the zone selector + date range.

## API access

- Domain wrappers under `src/app/lib/<domain>Api.ts` —
  `alertApi`, `adminUserApi`, `adminZoneApi`,
  `adminAlertApi`, `adminSensorUnitsApi`, `managerAffirmationApi`,
  etc.
- Components **never** call `axios` directly. They go through the
  wrapper, which goes through `src/app/lib/api.ts`.
- Wrappers return decoded `T[]` / `T` — list endpoints handle the
  paginated-vs-flat shape internally.

## Mutations

One pattern, always:

```ts
await someApi.update(id, payload);
message.success('…');
setLocalState((prev) => prev.map(…)); // or refetch()
```

**No `window.location.reload()` after a mutation.**

## Feedback

- `App.useApp().message.success | .error | .warning | .info`.
- Confirmations via `App.useApp().modal.confirm`. Destructive ones
  use `okType: 'danger'`.
- One-off success toast lowercase, no trailing period — multi-clause
  sentences keep the period.

## Loading & empty states

- antd `Table loading={…}` inside tables.
- antd `Skeleton active paragraph={{ rows: N }}` while a section
  is fetching.
- antd `<Empty />` when a list is empty (no ad-hoc `<div>Aucun…</div>`).
- `LoadingLeaf` for full-page hydration only.

## Forms

- antd `Form layout="vertical"`. Validation via `Form.Item` `rules`.
- Drawer-based create/edit (use `AdminEntityDrawer` for admin).
- Submit via `form.submit()` from the drawer footer's primary button.
- Never inline `useState`-driven controlled inputs — always go
  through `Form.Item`.

## Naming & file structure

- Components in `PascalCase.tsx`.
- Colocated style: `PascalCase.module.scss`.
- Pages live in `src/app/<route>/page.tsx`, components in
  `src/app/components/<feature>/`.
- Admin-only feature components under
  `src/app/components/admin/`; shared primitives under
  `src/app/components/admin/_shared/`.
- Domain types in the domain's API wrapper file, not in
  `src/app/types.ts` (that file is being phased out).

## Color & tokens

- Brand-green is the only accent. Never hardcode hex in TSX —
  reach for `brand.500`, `app.surface`, `app.border`,
  `app.text`, `app.text.muted` (Chakra) or the CSS vars.
- The full token list is in `src/app/styles/tokens/colors.ts`.

## Icons

`@ant-design/icons` only. When an icon is decorative inside a
button, prefer `icon={<XOutlined />}` on the antd `<Button>`
rather than rendering the icon as a child.

## Accessibility

- Every interactive element has either a visible label or an
  `aria-label`.
- Forms expose `Form.Item label=…`; never rely on placeholders alone.
- Modals + drawers use the antd defaults (focus trap, ESC close).

## When in doubt

Look at the reference implementations:

- `src/app/components/alert/AlertMain.tsx` — list with antd Table.
- `src/app/components/alert/AlertCreateDrawer.tsx` — create/edit
  drawer.
- `src/app/components/admin/AdminUserListMain.tsx` — admin list.
- `src/app/components/admin/UserCreateDrawer.tsx` — admin create.
- `src/app/components/admin/userDetail/UserDetailShell.tsx` —
  tabbed detail console with deep-link `?tab=` URL state.
