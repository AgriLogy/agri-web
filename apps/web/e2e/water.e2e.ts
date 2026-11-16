import { apiAs, expect, signIn, test, watchProblems } from './fixtures';

/**
 * Phase 3 scenario: "configure water source → simulate changing level →
 * verify volume/reserve → trigger low alerts", through the UI, with the
 * developer brief's example basin (8 x 3 m, 4.80 m, 10 m³ reserve).
 * OFFLINE needs the reading to age past the delay; the backend suite covers
 * it (agri-api test_water_level.py::test_offline_sweep_opens_and_recovers).
 */
test('water source: create, simulate, alert, edit, delete', async ({
  page,
  seed,
}) => {
  await signIn(page, seed.users.a);
  const problems = watchProblems(page);
  await page.goto('/water');

  await page.getByRole('button', { name: "Ajouter une source d'eau" }).click();
  // Named: the assistant side panel is a dialog too.
  const dialog = page.getByRole('dialog', { name: "Ajouter une source d'eau" });
  await dialog
    .getByLabel("Nom de la source d'eau")
    .fill('E2E Bassin principal');
  // Chakra draws the box over the hidden input: click the label instead.
  await dialog.getByText(seed.users.a.zones![0].name, { exact: true }).click();
  await expect(
    dialog.getByRole('checkbox', { name: seed.users.a.zones![0].name })
  ).toBeChecked();
  await dialog.getByLabel("Hauteur d'eau maximale").fill('4,8');
  await dialog.getByLabel('Longueur').fill('8');
  await dialog.getByLabel('Largeur').fill('3');
  await dialog.getByLabel('Réserve minimale').fill('10');
  await expect(dialog.getByText('115.2 m³')).toBeVisible();
  await dialog.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(dialog).toBeHidden();

  const card = page
    .locator('div')
    .filter({ hasText: 'E2E Bassin principal' })
    .filter({
      has: page.getByText('Simulateur de niveau'),
    })
    .last();
  await expect(card.getByText('Hors ligne')).toBeVisible();

  // Simulate the brief's level through the API the slider uses, then check
  // the card refreshes on the next slider move (UI path).
  const api = await apiAs(seed.users.a);
  const [source] = await (await api.get('/water-sources')).json();
  const slider = card.getByRole('slider');
  await slider.focus();
  await page.keyboard.press('End'); // 100 %
  await expect(card.getByText('Haut', { exact: true })).toBeVisible();
  await expect(
    card.getByText("Niveau d'eau haut", { exact: false })
  ).toBeVisible();

  const status = await (
    await api.post(`/water-sources/${source.id}/simulate`, {
      data: { level_m: 3.62 },
    })
  ).json();
  expect(status.metrics.volume_m3).toBeCloseTo(86.88, 2);
  expect(status.metrics.free_capacity_m3).toBeCloseTo(28.32, 2);
  expect(status.metrics.available_m3).toBeCloseTo(76.88, 2);
  expect(status.metrics.fill_percent).toBeCloseTo(75.42, 1);

  await page.keyboard.press('Home'); // 0 % → critical
  await expect(card.getByText(/Niveau d'eau critique/)).toBeVisible();
  await expect(card.getByText('Critique', { exact: true })).toBeVisible();

  const alerts = await (
    await api.get(`/water-sources/${source.id}/alerts`)
  ).json();
  expect(alerts.map((a: { kind: string }) => a.kind)).toEqual(
    expect.arrayContaining(['HIGH', 'CRITICAL'])
  );

  await page.reload();
  await card.getByRole('button', { name: 'Modifier' }).click();
  const edit = page.getByRole('dialog', { name: "Modifier la source d'eau" });
  await expect(edit.getByLabel("Nom de la source d'eau")).toHaveValue(
    'E2E Bassin principal'
  );
  await edit.getByRole('button', { name: 'Supprimer' }).click();
  await edit.getByRole('button', { name: /Cliquez à nouveau/ }).click();
  await expect(page.getByText('E2E Bassin principal')).toHaveCount(0);

  expect(problems.pageErrors).toEqual([]);
  expect(problems.serverErrors).toEqual([]);
});
