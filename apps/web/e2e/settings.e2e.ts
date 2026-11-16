import { apiAs, expect, signIn, test, watchProblems } from './fixtures';

/** Settings → Farms: a farmer renames a zone (agri-web#172). */
test('settings / farms: rename a zone', async ({ page, seed }) => {
  const zone = seed.users.a.zones![1];
  await signIn(page, seed.users.a);
  const problems = watchProblems(page);
  await page.goto('/settings');
  await page.getByRole('button', { name: 'Fermes' }).click();

  const card = page
    .locator('div')
    .filter({
      has: page.getByRole('heading', { name: `Ferme — zone #${zone.id}` }),
    })
    .last();
  const name = card.getByLabel('Nom de la ferme');
  await expect(name).toHaveValue(zone.name);
  await name.fill('E2E Zone A2 renommée');
  await card.getByRole('button', { name: 'Enregistrer le nom' }).click();
  await expect(page.getByText('Ferme mise à jour').first()).toBeVisible();

  const api = await apiAs(seed.users.a);
  const zones: { id: number; name: string }[] = await (
    await api.get('/zones')
  ).json();
  expect(zones.find((z) => z.id === zone.id)?.name).toBe(
    'E2E Zone A2 renommée'
  );
  expect(problems.pageErrors).toEqual([]);
  expect(problems.serverErrors).toEqual([]);
});

test('settings / farms: a technician cannot rename', async ({ page, seed }) => {
  await signIn(page, seed.users.tech, true);
  await page.goto('/settings');
  await page.getByRole('button', { name: 'Fermes' }).click();
  const zone = seed.users.tech.zones![0];
  const card = page
    .locator('div')
    .filter({
      has: page.getByRole('heading', { name: `Ferme — zone #${zone.id}` }),
    })
    .last();
  await expect(card.getByLabel('Nom de la ferme')).toBeDisabled();
  // And the API refuses it regardless of the UI.
  const api = await apiAs(seed.users.tech);
  expect(
    (await api.patch(`/zones/${zone.id}`, { data: { name: 'x' } })).status()
  ).toBe(403);
});
