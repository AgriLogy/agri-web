/**
 * The screenshot tour, as data. Each step opens one screen as one user, runs
 * a few non-destructive actions, and is screenshotted + evaluated by
 * tour.tour.ts. Captions and "how to test" are in French: they become the
 * founder's walkthrough (scripts/tour-report.mjs).
 *
 * Rules: never delete, never save a form, never run irrigation. The KML import
 * stops at its preview, the shape restore at its confirmation dialog.
 */
import path from 'node:path';
import {
  clickCanvas,
  hoverSector,
  openInsightsTab,
  mapDialog,
  msg,
  openMapModal,
  reveal,
  selectSector,
  setForecastLayer,
  setForecastOptions,
  type Locale,
  type Role,
  type TourCtx,
} from './helpers';

export type Viewport = 'desktop' | 'tall' | 'tablet' | 'mobile';

export const VIEWPORTS: Record<Viewport, { width: number; height: number }> = {
  desktop: { width: 1440, height: 900 },
  // Map modal steps: the sector panel sits above the map, so give it room.
  tall: { width: 1440, height: 1700 },
  tablet: { width: 820, height: 1180 },
  mobile: { width: 390, height: 844 },
};

/** Something that must (or must not) be visible once the step has run. */
export interface ExpectSpec {
  /** Visible text (plain string = substring). */
  text?: string | RegExp;
  /** Visible text from the message catalogue, in the step's locale. */
  key?: string;
  /** A button, by its catalogue label. */
  button?: string;
  selector?: string;
  /** Must NOT be visible (read-only checks). */
  absent?: boolean;
}

export interface TourStep {
  id: string;
  section: string;
  title: string;
  role: Role;
  locale: Locale;
  viewport: Viewport;
  /** Colour mode (default light). */
  theme?: 'light' | 'dark';
  path: string;
  actions?: (ctx: TourCtx) => Promise<void>;
  /** Runs after the screenshot (close a dialog, switch a layer back off). */
  cleanup?: (ctx: TourCtx) => Promise<void>;
  caption: string;
  howToTest: string[];
  expect?: ExpectSpec[];
  /** API 4xx this screen is known to trigger on purpose. */
  allow4xx?: RegExp[];
}

const S = {
  home: 'Connexion & tableau de bord',
  map: 'Carte de la ferme',
  crops: 'Sol, plantes & cultures',
  station: 'Station météo',
  water: 'Eau',
  alerts: 'Alertes',
  notif: 'Notifications',
  reports: 'Rapports',
  settings: 'Paramètres',
  assistant: 'Assistant',
  tech: 'Technicien',
  rtl: 'Arabe (RTL)',
  mobile: 'Mobile',
  dark: 'Mode sombre',
  en: 'Anglais',
  tablet: 'Tablette',
} as const;

const NORD = 'Parcelle Nord';
const SUD = 'Parcelle Sud';

/** Turn the forecast layer off in the saved map preferences. */
async function hideForecastLayer({ api }: TourCtx) {
  if (!api) return;
  const prefs = (await (await api.get('/map-preferences')).json()) as {
    layers?: Record<string, { visible: boolean; opacity: number }>;
  };
  const layers = { ...(prefs.layers ?? {}) };
  layers.forecast = {
    visible: false,
    opacity: layers.forecast?.opacity ?? 0.75,
  };
  await api.put('/map-preferences', { data: { layers } });
}

const farmer = { role: 'farmer', locale: 'fr', viewport: 'desktop' } as const;

const openTab =
  (key: string) =>
  async ({ page, locale }: TourCtx) => {
    // Reports use real tabs; Settings uses a row of buttons.
    const name = msg(locale, key);
    await page
      .getByRole('tab', { name })
      .or(page.getByRole('button', { name, exact: true }))
      .first()
      .click();
    await page
      .waitForLoadState('networkidle', { timeout: 8_000 })
      .catch(() => {});
  };

async function openSector(ctx: TourCtx, name: string) {
  await openMapModal(ctx);
  await selectSector(ctx, name);
}

const BASE_STEPS: TourStep[] = [
  // ---------------------------------------------------------------- accueil
  {
    id: 'login',
    section: S.home,
    title: 'Page de connexion',
    role: 'guest',
    locale: 'fr',
    viewport: 'desktop',
    path: '/login',
    caption:
      "La page de connexion d'Agrogo : nom d'utilisateur et mot de passe.",
    howToTest: [
      'Ouvrir l’application sans être connecté.',
      'Saisir un mauvais mot de passe : un message d’erreur clair s’affiche.',
      'Saisir les bons identifiants : le tableau de bord s’ouvre.',
    ],
    expect: [{ selector: 'input[type="password"]' }],
  },
  {
    id: 'dashboard',
    section: S.home,
    title: 'Tableau de bord',
    ...farmer,
    path: '/',
    caption:
      'Le tableau de bord réunit la carte de la ferme, la météo du jour et de la semaine, les dernières notifications et les vannes et pompes.',
    howToTest: [
      'Se connecter en tant qu’agriculteur.',
      'Vérifier que la météo correspond au lieu de la ferme.',
      'Résultat attendu : la carte montre « Parcelle Nord » et « Parcelle Sud ».',
    ],
    expect: [
      { key: 'shell.dashboard.title' },
      { key: 'misc.googleMapWeather.title' },
    ],
  },

  // ------------------------------------------------------------------ carte
  {
    id: 'map-overview',
    section: S.map,
    title: 'Carte agrandie',
    ...farmer,
    viewport: 'tall',
    path: '/',
    actions: async (ctx) => {
      await openMapModal(ctx);
      await mapDialog(ctx)
        .getByRole('button', { name: msg(ctx.locale, 'misc.map.fitFarm') })
        .click();
    },
    caption:
      'La carte plein écran : fond satellite, secteurs dessinés et capteurs placés, avec les boutons Calques, Mesurer, Satellite et Filtrer.',
    howToTest: [
      'Sur le tableau de bord, cliquer sur l’icône « Agrandir la carte ».',
      'Cliquer sur « Vue ferme ».',
      'Résultat attendu : la carte cadre les deux parcelles et leurs capteurs.',
    ],
    expect: [{ button: 'misc.map.measure.button' }],
  },
  {
    id: 'map-layers',
    section: S.map,
    title: 'Calques et fond de carte',
    ...farmer,
    viewport: 'tall',
    path: '/',
    actions: async (ctx) => {
      const d = await openMapModal(ctx);
      await d
        .getByRole('button', { name: msg(ctx.locale, 'misc.map.layersButton') })
        .click();
    },
    cleanup: async ({ page }) => page.keyboard.press('Escape'),
    caption:
      'Le panneau des calques : fond de carte, secteurs, état des secteurs, capteurs, appareils et le nouveau calque « Prévisions (pluie / ET0) ».',
    howToTest: [
      'Ouvrir la carte agrandie puis « Calques & fond de carte ».',
      'Changer le fond de carte, masquer puis réafficher les capteurs.',
      'Résultat attendu : la carte change immédiatement et le choix est retenu au prochain chargement.',
    ],
    expect: [{ key: 'misc.map.layers.forecast' }],
  },
  {
    id: 'map-insights-nord',
    section: S.map,
    title: 'Conseil d’irrigation — Parcelle Nord',
    ...farmer,
    viewport: 'tall',
    path: '/',
    actions: (ctx) => openSector(ctx, NORD),
    caption:
      'En cliquant sur un secteur, le panneau « Conseil » (onglet « Irrigation ») affiche le bilan hydrique (déficit Dr face à la RFU et à la RU), le Kc utilisé, la recommandation et le graphique des 14 derniers jours.',
    howToTest: [
      'Ouvrir la carte agrandie et cliquer à l’intérieur de « Parcelle Nord ».',
      'Lire la section « Conseil » sous l’en-tête du secteur : onglets « Irrigation », « Végétation » et « Satellite ».',
      'Résultat attendu : onglet « Irrigation » ouvert avec Kc 1.15 (table Kc · Mi-saison), déficit de l’ordre de 30 mm et un état (« Réserve suffisante », « Irriguer bientôt » ou « Irriguer maintenant » selon la météo réelle des 14 derniers jours) ; l’onglet « Végétation » affiche « Saine ».',
    ],
    expect: [
      { key: 'misc.map.insights.title' },
      // The status chip follows the day's real weather (ok / irrigate soon /
      // irrigate now), so expect the section, not one particular status.
      { key: 'misc.map.insights.waterBalance' },
      { key: 'misc.map.insights.dr' },
      { text: /Kc 1\.15/ },
      { key: 'misc.map.insights.chartTitle' },
    ],
  },
  {
    id: 'map-insights-sud',
    section: S.map,
    title: 'Conseil — secteur sans zone',
    ...farmer,
    viewport: 'tall',
    path: '/',
    actions: (ctx) => openSector(ctx, SUD),
    caption:
      'Pour un secteur sans zone de capteurs, le bilan hydrique est indisponible et la raison est expliquée ; les valeurs manquantes s’affichent « — ».',
    howToTest: [
      'Ouvrir la carte agrandie et cliquer dans « Parcelle Sud ».',
      'Lire la section « Conseil ».',
      'Résultat attendu : « Bilan hydrique indisponible : aucune zone (capteurs) n’est rattachée à ce secteur. », sans « NaN ».',
    ],
    expect: [{ text: msgText('misc.map.insights.reason.no_zone') }],
  },
  {
    id: 'map-ndvi-history',
    section: S.map,
    title: 'Indices satellite et historique 12 mois',
    ...farmer,
    viewport: 'tall',
    path: '/',
    actions: async (ctx) => {
      await openSector(ctx, NORD);
      await openInsightsTab(ctx, 'satellite');
      await reveal(ctx.page, '#sector-ndvi-history');
    },
    caption:
      'L’onglet « Satellite » du secteur montre l’historique NDVI enregistré sur 12 mois (moyenne et plage min–max), sans nouvelle requête au satellite.',
    howToTest: [
      'Sélectionner « Parcelle Nord », ouvrir l’onglet « Satellite » puis faire défiler jusqu’à l’historique.',
      'Lire le graphique « Historique (12 mois) ».',
      'Résultat attendu : une courbe NDVI avec une douzaine de points.',
    ],
    expect: [{ selector: '#sector-ndvi-history' }],
  },
  {
    id: 'map-ndvi-index',
    section: S.map,
    title: 'Historique — changement d’indice (NDMI)',
    ...farmer,
    viewport: 'tall',
    path: '/',
    actions: async (ctx) => {
      await openSector(ctx, NORD);
      await openInsightsTab(ctx, 'satellite');
      const select = ctx.page
        .getByLabel(msg(ctx.locale, 'misc.map.ndvi.index'))
        .locator('visible=true')
        .first();
      if (await select.count()) {
        await select.selectOption('ndmi');
        await ctx.page
          .waitForLoadState('networkidle', { timeout: 8_000 })
          .catch(() => {});
      }
      await reveal(ctx.page, '#sector-ndvi-history');
    },
    caption:
      'L’historique suit l’indice choisi : ici le NDMI (eau du couvert végétal).',
    howToTest: [
      'Dans l’onglet « Satellite », choisir « NDMI · eau du couvert ».',
      'Résultat attendu : le titre de l’historique et la courbe passent au NDMI.',
      'Si les images satellite ne sont pas activées sur le serveur, le sélecteur n’apparaît pas : l’historique reste en NDVI.',
    ],
    expect: [{ selector: '#sector-ndvi-history' }],
  },
  {
    id: 'map-shape-history',
    section: S.map,
    title: 'Historique du contour',
    ...farmer,
    viewport: 'tall',
    path: '/',
    actions: async (ctx) => {
      await openSector(ctx, NORD);
      await ctx.page
        .getByRole('button', {
          name: msg(ctx.locale, 'misc.map.shapeHistory.title'),
        })
        .locator('visible=true')
        .first()
        .click();
      await ctx.page
        .getByText(msg(ctx.locale, 'misc.map.shapeHistory.current'))
        .locator('visible=true')
        .first()
        .waitFor();
    },
    caption:
      'Chaque modification du contour est conservée : date, origine (dessin, import KML, restauration) et surface.',
    howToTest: [
      'Sélectionner « Parcelle Nord » puis déplier « Historique du contour ».',
      'Résultat attendu : au moins deux versions, la plus récente marquée « Actuel ».',
    ],
    expect: [{ key: 'misc.map.shapeHistory.current' }],
  },
  {
    id: 'map-shape-restore',
    section: S.map,
    title: 'Restaurer un contour (confirmation)',
    ...farmer,
    viewport: 'tall',
    path: '/',
    actions: async (ctx) => {
      await openSector(ctx, NORD);
      const p = ctx.page;
      await p
        .getByRole('button', {
          name: msg(ctx.locale, 'misc.map.shapeHistory.title'),
        })
        .locator('visible=true')
        .first()
        .click();
      await p
        .getByRole('button', {
          name: msg(ctx.locale, 'misc.map.shapeHistory.restore'),
          exact: true,
        })
        .locator('visible=true')
        .first()
        .click();
      await p.getByRole('alertdialog').waitFor();
    },
    cleanup: async ({ page, locale }) =>
      page
        .getByRole('alertdialog')
        .getByRole('button', {
          name: msg(locale, 'misc.map.shapeHistory.cancel'),
        })
        .click(),
    caption:
      'Restaurer une ancienne version demande une confirmation ; le contour actuel reste dans l’historique.',
    howToTest: [
      'Dans « Historique du contour », cliquer sur « Restaurer » d’une ancienne version.',
      'Lire la fenêtre de confirmation, puis « Annuler » (ou « Restaurer » pour essayer).',
      'Résultat attendu après restauration : la parcelle reprend l’ancienne forme et une ligne « Restauration » apparaît.',
    ],
    expect: [{ key: 'misc.map.shapeHistory.confirmTitle' }],
  },
  {
    id: 'map-forecast-rain',
    section: S.map,
    title: 'Calque Prévisions — pluie sur 3 jours',
    ...farmer,
    viewport: 'tall',
    path: '/',
    actions: async (ctx) => {
      const d = await openMapModal(ctx);
      await setForecastLayer(ctx, d, true);
      await setForecastOptions(ctx, { days: 3, metric: 'rain' });
    },
    caption:
      'Le calque « Prévisions » colore chaque secteur selon la pluie prévue (Open-Meteo) sur l’horizon choisi, avec sa légende.',
    howToTest: [
      'Carte agrandie → « Calques & fond de carte » → activer « Prévisions (pluie / ET0) ».',
      'Choisir « 3 jours » et « Pluie totale ».',
      'Résultat attendu : les secteurs se colorent en bleu selon le cumul prévu ; la légende est en haut à gauche.',
    ],
    expect: [{ selector: '[data-testid="forecast-legend"]' }],
  },
  {
    id: 'map-forecast-balance',
    section: S.map,
    title: 'Calque Prévisions — bilan pluie − ET0 sur 7 jours',
    ...farmer,
    viewport: 'tall',
    path: '/',
    actions: async (ctx) => {
      const d = await openMapModal(ctx);
      await setForecastLayer(ctx, d, true);
      await setForecastOptions(ctx, { days: 7, metric: 'balance' });
      await hoverSector(ctx, NORD);
    },
    // Switch the layer back off for the next steps (it is a saved preference).
    cleanup: (ctx) => hideForecastLayer(ctx),
    caption:
      'Avec l’indicateur « Pluie − ET0 », rouge = le sol s’assèche, bleu = il se recharge. Le survol d’un secteur affiche pluie, ET0 et bilan.',
    howToTest: [
      'Choisir « 7 jours » et « Pluie − ET0 ».',
      'Passer la souris (ou toucher) un secteur.',
      'Résultat attendu : une bulle avec le nom du secteur, la pluie, l’ET0 et le bilan en mm ; aucun « NaN ».',
    ],
    expect: [{ selector: '.agrilogy-forecast-popup' }],
  },
  {
    id: 'map-tools',
    section: S.map,
    title: 'Outils de dessin',
    ...farmer,
    viewport: 'tall',
    path: '/',
    actions: async (ctx) => {
      await openMapModal(ctx);
      await mapDialog(ctx)
        .getByRole('button', {
          name: msg(ctx.locale, 'misc.googleMapWeather.showTools'),
        })
        .click();
    },
    caption:
      'Les outils carte : dessiner, sélectionner, modifier les sommets, supprimer, annuler/rétablir, importer GeoJSON ou KML et placer des capteurs.',
    howToTest: [
      'Carte agrandie → « Outils carte ».',
      'Dessiner un petit secteur de test puis « ↶ Défaire ».',
      'Résultat attendu : le dessin disparaît ; rien n’est enregistré tant qu’on ne valide pas.',
    ],
    expect: [{ button: 'misc.map.kml.button' }],
  },
  {
    id: 'map-kml-preview',
    section: S.map,
    title: 'Import KML — aperçu',
    ...farmer,
    viewport: 'tall',
    path: '/',
    actions: async (ctx) => {
      const d = await openMapModal(ctx);
      await d
        .getByRole('button', {
          name: msg(ctx.locale, 'misc.googleMapWeather.showTools'),
        })
        .click();
      await d
        .getByRole('button', { name: msg(ctx.locale, 'misc.map.kml.button') })
        .click();
      await ctx.page
        .getByTestId('kml-file-input')
        .setInputFiles(path.join(ctx.fixturesDir, 'demo-farm.kml'));
      await ctx.page.getByText('Bloc Est').waitFor({ timeout: 20_000 });
    },
    cleanup: async ({ page, locale }) =>
      page
        .getByRole('button', { name: msg(locale, 'misc.map.kml.cancel') })
        .last()
        .click(),
    caption:
      'L’import KML analyse d’abord le fichier : secteurs qui seront créés (nom, surface, périmètre) et éléments ignorés avec la raison. Rien n’est créé avant confirmation.',
    howToTest: [
      'Outils carte → « Importer KML » → choisir le fichier demo-farm.kml (fourni avec la recette).',
      'Résultat attendu : « 1 secteur à créer » (Bloc Est), « Parcelle Nord — nom déjà utilisé », « Puits — pas un polygone ».',
      'Cliquer sur « Créer 1 secteur » pour l’import réel, ou « Annuler ».',
    ],
    expect: [
      { text: 'Bloc Est' },
      { key: 'misc.map.kml.reason.duplicate_name' },
      { key: 'misc.map.kml.reason.not_a_polygon' },
    ],
  },
  {
    id: 'map-measure',
    section: S.map,
    title: 'Mesurer une distance et une surface',
    ...farmer,
    viewport: 'tall',
    path: '/',
    actions: async (ctx) => {
      const d = await openMapModal(ctx);
      await d
        .getByRole('button', {
          name: msg(ctx.locale, 'misc.map.measure.button'),
        })
        .click();
      await clickCanvas(ctx.page, [
        [-120, -60],
        [100, -70],
        [60, 90],
      ]);
    },
    caption:
      'L’outil « Mesurer » calcule la longueur d’un tracé et la surface du polygone formé, sans rien enregistrer.',
    howToTest: [
      'Carte agrandie → « Mesurer ».',
      'Cliquer trois points sur la carte.',
      'Résultat attendu : une distance (m) puis une surface (m² ou ha) en bas de la carte.',
    ],
    expect: [{ key: 'misc.map.measure.done' }, { text: /Distance : \d/ }],
  },
  {
    id: 'map-filter',
    section: S.map,
    title: 'Filtrer les capteurs',
    ...farmer,
    viewport: 'tall',
    path: '/',
    actions: async (ctx) => {
      const d = await openMapModal(ctx);
      await d
        .getByRole('button', {
          name: msg(ctx.locale, 'misc.map.filter.button'),
        })
        .click();
    },
    cleanup: async ({ page }) => page.keyboard.press('Escape'),
    caption:
      'Le filtre des capteurs par type, par état (normal, attention, critique, hors ligne…) et par secteur.',
    howToTest: [
      'Carte agrandie → « Filtrer les capteurs ».',
      'Décocher « Humidité sol ».',
      'Résultat attendu : les capteurs d’humidité disparaissent de la carte ; « Réinitialiser » les fait revenir.',
    ],
  },
  {
    id: 'farm',
    section: S.map,
    title: 'Ma ferme — secteurs et zones',
    ...farmer,
    path: '/farm',
    caption:
      'La page « Ma ferme » liste les secteurs et les zones de capteurs qui leur sont rattachées.',
    howToTest: [
      'Menu → « Ma ferme ».',
      'Résultat attendu : « Parcelle Nord (2) » avec ses deux zones et « Parcelle Sud (0) ».',
    ],
    expect: [{ text: 'Parcelle Nord' }, { text: 'Parcelle Sud' }],
  },

  // ------------------------------------------------- sol, plantes, cultures
  {
    id: 'soil',
    section: S.crops,
    title: 'Données du sol',
    ...farmer,
    path: '/soil',
    caption:
      'Humidité, température, pH, conductivité et NPK du sol par zone, avec export CSV et création d’alerte depuis chaque graphique.',
    howToTest: [
      'Menu → « Sol ».',
      'Changer de zone en haut de page.',
      'Résultat attendu : les graphiques se mettent à jour ; « Exporter en CSV » télécharge les mesures.',
    ],
    expect: [{ text: 'Données sur le sol' }],
  },
  {
    id: 'plant',
    section: S.crops,
    title: 'Données des plantes',
    ...farmer,
    path: '/plant',
    caption:
      'Calibre et diamètre des fruits, humidité et température des feuilles.',
    howToTest: [
      'Menu → « Plantes ».',
      'Résultat attendu : trois graphiques avec des valeurs récentes et sans « NaN ».',
    ],
    expect: [{ text: 'Données des plantes' }],
  },
  {
    id: 'crop-calendar',
    section: S.crops,
    title: 'Calendrier cultural (Kc)',
    ...farmer,
    path: '/crop-calendar',
    caption:
      'Le calendrier cultural définit le Kc de chaque période de la culture ; c’est lui qu’utilise le conseil d’irrigation.',
    howToTest: [
      'Menu → « Calendrier cultural ».',
      'Ouvrir « Modifier » sur la culture de démonstration (sans enregistrer).',
      'Résultat attendu : la période « Mi-saison » a un Kc de 1.15.',
    ],
    expect: [{ text: 'Calendrier cultural' }],
  },

  // ------------------------------------------------------------- station
  {
    id: 'station',
    section: S.station,
    title: 'Station météo',
    ...farmer,
    path: '/station',
    caption:
      'Vent (rose des directions), température et humidité de l’air, DPV, ET₀, rayonnement et pluie cumulée.',
    howToTest: [
      'Menu → « Station météo ».',
      'Survoler un graphique.',
      'Résultat attendu : une info-bulle avec la date, l’heure (heure du Maroc) et la valeur.',
    ],
    expect: [{ text: 'Station météo' }],
  },

  // --------------------------------------------------------------------- eau
  {
    id: 'water',
    section: S.water,
    title: 'Eau — sources et capteurs',
    ...farmer,
    path: '/water',
    caption:
      'Les sources d’eau (ici le « Bassin principal ») avec volume, réserve et simulateur, puis débit, pression, pH et conductivité de l’eau d’irrigation.',
    howToTest: [
      'Menu → « Eau ».',
      'Résultat attendu : la carte « Bassin principal » montre niveau, volume et état.',
    ],
    expect: [{ text: 'Bassin principal' }],
  },
  {
    id: 'water-simulator',
    section: S.water,
    title: 'Simulateur de niveau du bassin',
    ...farmer,
    path: '/water',
    actions: async ({ page }) => {
      const slider = page.getByRole('slider').first();
      await slider.focus();
      await page.keyboard.press('End');
      await page
        .waitForLoadState('networkidle', { timeout: 8_000 })
        .catch(() => {});
    },
    caption:
      'Le simulateur fait varier le niveau du bassin pour vérifier volumes et alertes ; à 100 % le niveau passe à « Haut ».',
    howToTest: [
      'Sur la carte du bassin, déplacer le curseur « Simulateur de niveau » tout à droite.',
      'Résultat attendu : l’état « Haut » et une alerte « Niveau d’eau haut ».',
      'Ramener le curseur tout à gauche : état « Critique ».',
    ],
    expect: [{ text: 'Haut' }],
  },
  {
    id: 'water-source-form',
    section: S.water,
    title: 'Fiche de la source d’eau',
    ...farmer,
    path: '/water',
    actions: async ({ page, locale }) => {
      await page
        .getByRole('button', { name: msg(locale, 'common.edit') })
        .first()
        .click();
      await page.getByRole('dialog').last().waitFor();
    },
    cleanup: async ({ page }) => page.keyboard.press('Escape'),
    caption:
      'La fiche du bassin : forme, dimensions, hauteur maximale, réserve minimale et zones desservies ; la capacité est calculée en direct.',
    howToTest: [
      'Cliquer sur « Modifier » du bassin.',
      'Changer la longueur sans enregistrer.',
      'Résultat attendu : la capacité (m³) se recalcule ; « Annuler » ne change rien.',
    ],
  },
  {
    id: 'valves-pumps',
    section: S.water,
    title: 'Vannes et pompes',
    ...farmer,
    path: '/vannes-pompes',
    caption:
      'Commande manuelle des vannes et pompes, programmes planifiés et historique des commandes.',
    howToTest: [
      'Menu → « Vannes et pompes ».',
      'Lire l’historique des commandes (ne rien démarrer en production).',
      'Résultat attendu : chaque vanne et pompe affiche son état.',
    ],
    expect: [{ text: 'Vannes et pompes' }],
  },
  {
    id: 'valves-schema',
    section: S.water,
    title: 'Schéma hydraulique',
    ...farmer,
    path: '/vannes-pompes/schema',
    caption:
      'Le schéma du réseau : collecteur des vannes, ligne principale et pompes de dosage.',
    howToTest: [
      'Vannes et pompes → « Schéma ».',
      'Résultat attendu : un schéma lisible, sans éléments qui se chevauchent.',
    ],
    expect: [{ text: 'Schéma vannes & pompes' }],
  },

  // ----------------------------------------------------------------- alertes
  {
    id: 'alerts',
    section: S.alerts,
    title: 'Gestion des alertes',
    ...farmer,
    path: '/alerts',
    caption: 'La liste des alertes configurées par capteur, avec leurs seuils.',
    howToTest: [
      'Menu → « Alertes ».',
      'Résultat attendu : chaque alerte affiche capteur, seuil et état (active ou non).',
    ],
    expect: [{ key: 'alertsPage.main.pageTitle' }],
  },
  {
    id: 'alert-form',
    section: S.alerts,
    title: 'Nouvelle alerte',
    ...farmer,
    path: '/alerts',
    actions: async ({ page, locale }) => {
      await page
        .getByRole('button', { name: msg(locale, 'alertsPage.main.newAlert') })
        .first()
        .click();
      await page.getByRole('dialog').last().waitFor();
    },
    cleanup: async ({ page }) => page.keyboard.press('Escape'),
    caption:
      'Le formulaire de création d’alerte : capteur, condition, seuil, période et canaux de notification.',
    howToTest: [
      'Cliquer sur « Nouvelle alerte ».',
      'Remplir un seuil d’humidité sol < 20 % puis « Enregistrer ».',
      'Résultat attendu : l’alerte apparaît dans la liste ; la supprimer ensuite.',
    ],
  },

  // ----------------------------------------------------------- notifications
  {
    id: 'notifications',
    section: S.notif,
    title: 'Notifications',
    ...farmer,
    path: '/notifications',
    caption:
      'Toutes les notifications reçues (alertes, niveau d’eau, décisions d’irrigation), les plus récentes en premier.',
    howToTest: [
      'Cliquer sur la cloche en haut à droite, puis « Tout voir ».',
      'Résultat attendu : la liste correspond au nombre affiché sur la cloche.',
    ],
    expect: [{ text: 'Notifications' }],
  },
  {
    id: 'notification-zones',
    section: S.notif,
    title: 'Zones de notification',
    ...farmer,
    path: '/notification-zones',
    caption:
      'Les zones de notification regroupent capteurs et destinataires pour ne recevoir que ce qui compte.',
    howToTest: [
      'Notifications → « Gérer les zones de notification ».',
      'Résultat attendu : la liste des zones et le bouton « Nouvelle zone ».',
    ],
    expect: [{ key: 'notificationZones.create' }],
  },

  // ---------------------------------------------------------------- rapports
  {
    id: 'reports-alerts',
    section: S.reports,
    title: 'Rapports — alertes',
    ...farmer,
    path: '/reports',
    caption: 'Le rapport des alertes déclenchées sur la période choisie.',
    howToTest: [
      'Menu → « Rapports ».',
      'Changer la période.',
      'Résultat attendu : les totaux et le tableau se mettent à jour.',
    ],
    expect: [{ key: 'reports.title' }],
  },
  {
    id: 'reports-decisions',
    section: S.reports,
    title: 'Rapports — décisions d’irrigation',
    ...farmer,
    path: '/reports',
    actions: openTab('reports.tabDecisions'),
    caption:
      'L’historique des décisions d’irrigation (automatiques ou manuelles) avec leur justification.',
    howToTest: [
      'Rapports → onglet « Décisions d’irrigation ».',
      'Résultat attendu : chaque décision a une date, une zone et une raison.',
    ],
  },

  // -------------------------------------------------------------- paramètres
  {
    id: 'settings-profile',
    section: S.settings,
    title: 'Paramètres — profil',
    ...farmer,
    path: '/settings',
    actions: openTab('settings.main.tabProfile'),
    caption: 'Le profil du compte : nom, coordonnées et langue.',
    howToTest: [
      'Menu → « Paramètres » → « Profil ».',
      'Résultat attendu : les informations du compte connecté.',
    ],
    expect: [{ key: 'settings.main.tabProfile' }],
  },
  {
    id: 'settings-farms',
    section: S.settings,
    title: 'Paramètres — fermes',
    ...farmer,
    path: '/settings',
    actions: openTab('settings.main.tabFarms'),
    caption:
      'Les fermes du compte et leur position, utilisée pour la météo et les prévisions.',
    howToTest: [
      'Paramètres → onglet « Fermes ».',
      'Résultat attendu : la ferme de démonstration près de Berrechid.',
    ],
  },
  {
    id: 'settings-sensors',
    section: S.settings,
    title: 'Paramètres — capteurs',
    ...farmer,
    path: '/settings',
    actions: openTab('settings.main.tabSensors'),
    caption:
      'Les capteurs du compte avec leurs dernières valeurs, unités et zones.',
    howToTest: [
      'Paramètres → « Capteurs » → « Actualiser les dernières valeurs ».',
      'Résultat attendu : chaque capteur a une valeur récente et une unité.',
    ],
  },
  {
    id: 'settings-calibration',
    section: S.settings,
    title: 'Paramètres — étalonnage',
    ...farmer,
    path: '/settings',
    actions: openTab('settings.main.tabCalibration'),
    caption:
      'L’étalonnage convertit la valeur brute d’un capteur (équation, unité affichée).',
    howToTest: [
      'Paramètres → « Étalonnage ».',
      'Résultat attendu : la liste des étalonnages ; un nouvel étalonnage change l’affichage des graphiques du capteur.',
    ],
  },
  {
    id: 'settings-technicians',
    section: S.settings,
    title: 'Paramètres — techniciens',
    ...farmer,
    path: '/settings',
    actions: openTab('settings.main.tabTechnicians'),
    caption:
      'Les comptes techniciens et les zones auxquelles chacun a accès (lecture seule).',
    howToTest: [
      'Paramètres → « Techniciens ».',
      'Résultat attendu : le technicien de démonstration, limité à « E2E Zone A1 ».',
    ],
  },

  // ---------------------------------------------------------------- assistant
  {
    id: 'assistant',
    section: S.assistant,
    title: 'Assistant Agrogo',
    ...farmer,
    path: '/chat',
    caption:
      'L’assistant répond aux questions sur la ferme (capteurs, irrigation, météo) en pleine page.',
    howToTest: [
      'Ouvrir « Assistant » ou le bouton vert sur le côté.',
      'Demander « Quel est l’état de la Parcelle Nord ? ».',
      'Résultat attendu : une réponse en français qui cite les données de la ferme.',
    ],
  },

  // --------------------------------------------------------------- technicien
  {
    id: 'tech-dashboard',
    section: S.tech,
    title: 'Technicien — tableau de bord',
    role: 'technician',
    locale: 'fr',
    viewport: 'desktop',
    path: '/',
    caption:
      'Un technicien voit le tableau de bord de la ferme en lecture seule : pas d’outils de dessin.',
    howToTest: [
      'Se connecter avec un compte technicien.',
      'Résultat attendu : pas de bouton « Outils carte » ; les données de « E2E Zone A1 » sont visibles.',
    ],
    expect: [
      { key: 'shell.dashboard.title' },
      { button: 'misc.googleMapWeather.showTools', absent: true },
    ],
  },
  {
    id: 'tech-map',
    section: S.tech,
    title: 'Technicien — carte de la ferme',
    role: 'technician',
    locale: 'fr',
    viewport: 'tall',
    path: '/',
    actions: async (ctx) => {
      await openMapModal(ctx, 0);
    },
    caption:
      'La carte agrandie en technicien : ni « Outils carte » ni import KML. Point à vérifier : les secteurs de la ferme n’apparaissent pas pour le technicien (l’API ne lui renvoie aucun secteur), donc pas de conseil d’irrigation pour lui.',
    howToTest: [
      'En technicien, agrandir la carte du tableau de bord.',
      'Résultat attendu : aucun bouton de dessin ni d’import.',
      'Vérifier si « Parcelle Nord » et « Parcelle Sud » devraient être visibles pour le technicien (aujourd’hui : non).',
    ],
    expect: [
      { button: 'misc.googleMapWeather.showTools', absent: true },
      { button: 'misc.map.kml.button', absent: true },
    ],
  },
  {
    id: 'tech-water',
    section: S.tech,
    title: 'Technicien — eau',
    role: 'technician',
    locale: 'fr',
    viewport: 'desktop',
    path: '/water',
    caption:
      'Le technicien voit les données d’eau sans pouvoir ajouter de source.',
    howToTest: [
      'En technicien, menu → « Eau ».',
      'Résultat attendu : pas de bouton « Ajouter une source d’eau ».',
    ],
    expect: [{ button: 'analytics.waterSource.add', absent: true }],
  },
  {
    id: 'tech-alerts',
    section: S.tech,
    title: 'Technicien — alertes',
    role: 'technician',
    locale: 'fr',
    viewport: 'desktop',
    path: '/alerts',
    caption: 'La page des alertes en lecture seule pour le technicien.',
    howToTest: [
      'En technicien, menu → « Alertes ».',
      'Résultat attendu : la liste est visible, sans création ni suppression.',
    ],
    expect: [{ key: 'alertsPage.main.pageTitle' }],
  },

  // -------------------------------------------------------------------- arabe
  {
    id: 'ar-dashboard',
    section: S.rtl,
    title: 'Tableau de bord en arabe',
    role: 'farmer',
    locale: 'ar',
    viewport: 'desktop',
    path: '/',
    caption:
      'L’interface arabe s’affiche de droite à gauche : menu à droite, textes alignés à droite.',
    howToTest: [
      'Changer la langue en « العربية » (en haut à droite).',
      'Résultat attendu : toute la page bascule de droite à gauche, sans texte français restant.',
    ],
    expect: [{ key: 'shell.dashboard.title' }],
  },
  {
    id: 'ar-map-insights',
    section: S.rtl,
    title: 'Conseil d’irrigation en arabe',
    role: 'farmer',
    locale: 'ar',
    viewport: 'tall',
    path: '/',
    actions: (ctx) => openSector(ctx, NORD),
    caption:
      'Le panneau « Conseil » en arabe : onglets, titres et états traduits ; la jauge se remplit depuis la droite. Les messages agronomiques arrivent en arabe (?lang=ar) sur un serveur à jour, en français sur un ancien.',
    howToTest: [
      'En arabe, agrandir la carte et cliquer dans « Parcelle Nord ».',
      'Résultat attendu : « نصيحة » et « مخزون كافٍ », jauge et graphique lisibles.',
    ],
    expect: [
      { key: 'misc.map.insights.title' },
      { key: 'misc.map.insights.tabs.irrigation' },
    ],
  },
  {
    id: 'ar-water',
    section: S.rtl,
    title: 'Eau en arabe',
    role: 'farmer',
    locale: 'ar',
    viewport: 'desktop',
    path: '/water',
    caption: 'La page Eau en arabe, avec la carte du bassin.',
    howToTest: [
      'En arabe, ouvrir la page « Eau ».',
      'Résultat attendu : « مصادر المياه » et les chiffres du bassin bien alignés.',
    ],
    expect: [{ text: 'مصادر المياه' }],
  },
  {
    id: 'ar-settings',
    section: S.rtl,
    title: 'Paramètres en arabe',
    role: 'farmer',
    locale: 'ar',
    viewport: 'desktop',
    path: '/settings',
    caption:
      'Les paramètres en arabe : onglets et tableaux en sens droite-à-gauche.',
    howToTest: [
      'En arabe, ouvrir « Paramètres ».',
      'Résultat attendu : les onglets commencent à droite ; les tableaux ne débordent pas.',
    ],
    expect: [{ key: 'settings.main.tabProfile' }],
  },

  // ------------------------------------------------------------------- mobile
  {
    id: 'mobile-dashboard',
    section: S.mobile,
    title: 'Tableau de bord sur téléphone',
    role: 'farmer',
    locale: 'fr',
    viewport: 'mobile',
    path: '/',
    caption:
      'Sur téléphone, les cartes du tableau de bord s’empilent et le menu passe en bas / dans un tiroir.',
    howToTest: [
      'Ouvrir l’application sur un téléphone (ou un écran étroit).',
      'Résultat attendu : rien ne dépasse à droite ; tout se lit sans zoomer.',
    ],
    expect: [{ key: 'misc.googleMapWeather.title' }],
  },
  {
    id: 'mobile-map-insights',
    section: S.mobile,
    title: 'Conseil d’un secteur sur téléphone',
    role: 'farmer',
    locale: 'fr',
    viewport: 'mobile',
    path: '/',
    actions: async (ctx) => {
      await openSector(ctx, NORD);
      await reveal(ctx.page, '#sector-insights-panel');
    },
    caption:
      'La carte agrandie occupe tout l’écran du téléphone ; le conseil du secteur s’affiche au-dessus de la carte.',
    howToTest: [
      'Sur téléphone, agrandir la carte et toucher « Parcelle Nord ».',
      'Résultat attendu : le conseil est lisible, sans débordement horizontal.',
    ],
    expect: [{ key: 'misc.map.insights.title' }],
  },
  {
    id: 'mobile-water',
    section: S.mobile,
    title: 'Eau sur téléphone',
    role: 'farmer',
    locale: 'fr',
    viewport: 'mobile',
    path: '/water',
    caption: 'La page Eau sur téléphone : carte du bassin puis graphiques.',
    howToTest: [
      'Sur téléphone, ouvrir « Eau ».',
      'Résultat attendu : le simulateur se manipule au doigt ; les graphiques tiennent dans la largeur.',
    ],
    expect: [{ text: 'Bassin principal' }],
  },
  {
    id: 'mobile-alerts',
    section: S.mobile,
    title: 'Alertes sur téléphone',
    role: 'farmer',
    locale: 'fr',
    viewport: 'mobile',
    path: '/alerts',
    caption: 'La gestion des alertes sur téléphone.',
    howToTest: [
      'Sur téléphone, ouvrir « Alertes ».',
      'Résultat attendu : la liste et le bouton « Nouvelle alerte » sont accessibles sans zoom.',
    ],
    expect: [{ key: 'alertsPage.main.pageTitle' }],
  },
];

export const STEPS: TourStep[] = [...BASE_STEPS, ...variants()];

/**
 * The same screens in the other display modes (dark, English, tablet, Arabic
 * on a phone). Each variant reuses its base step's path and actions; catalogue
 * expectations follow the variant's locale automatically, plain French text
 * expectations are dropped outside French.
 */
function variants(): TourStep[] {
  const byId = (id: string) => {
    const base = BASE_STEPS.find((s) => s.id === id);
    if (!base) throw new Error(`unknown tour step ${id}`);
    return base;
  };
  const make = (
    id: string,
    baseId: string,
    over: Partial<TourStep> & Pick<TourStep, 'section' | 'title' | 'caption'>
  ): TourStep => {
    const base = byId(baseId);
    const locale = over.locale ?? base.locale;
    return {
      ...base,
      howToTest: base.howToTest,
      expect:
        locale === 'fr'
          ? base.expect
          : base.expect?.filter((e) => e.text === undefined),
      ...over,
      id,
    };
  };
  const darkHow = (screen: string) => [
    'Cliquer sur l’icône lune en haut à droite pour passer en mode sombre.',
    `Ouvrir ${screen}.`,
    'Résultat attendu : fonds sombres, textes lisibles, aucun bloc resté blanc, graphiques contrastés.',
  ];
  return [
    make('dark-dashboard', 'dashboard', {
      section: S.dark,
      theme: 'dark',
      title: 'Tableau de bord — mode sombre',
      caption:
        'Le tableau de bord en mode sombre : mêmes cartes et graphiques, couleurs adaptées à la nuit.',
      howToTest: darkHow('le tableau de bord'),
    }),
    make('dark-map-insights', 'map-insights-nord', {
      section: S.dark,
      theme: 'dark',
      title: 'Conseil d’irrigation — mode sombre',
      caption:
        'Le panneau Conseil de « Parcelle Nord » en mode sombre : jauge, recommandation, graphique 14 jours et carte Végétation.',
      howToTest: darkHow('la carte, puis cliquer sur « Parcelle Nord »'),
    }),
    make('dark-forecast', 'map-forecast-balance', {
      section: S.dark,
      theme: 'dark',
      title: 'Calque Prévisions — mode sombre',
      caption:
        'Le calque Prévisions (bilan pluie − ET0) et sa légende en mode sombre.',
      howToTest: darkHow('la carte et activer le calque « Prévisions »'),
    }),
    make('dark-station', 'station', {
      section: S.dark,
      theme: 'dark',
      title: 'Station météo — mode sombre',
      caption: 'La station météo en mode sombre.',
      howToTest: darkHow('« Station météo »'),
    }),
    make('dark-water', 'water', {
      section: S.dark,
      theme: 'dark',
      title: 'Eau — mode sombre',
      caption: 'Les sources d’eau et la jauge du bassin en mode sombre.',
      howToTest: darkHow('« Eau »'),
    }),
    make('dark-alerts', 'alerts', {
      section: S.dark,
      theme: 'dark',
      title: 'Alertes — mode sombre',
      caption: 'La gestion des alertes en mode sombre.',
      howToTest: darkHow('« Alertes »'),
    }),
    make('dark-settings', 'settings-profile', {
      section: S.dark,
      theme: 'dark',
      title: 'Paramètres — mode sombre',
      caption: 'Les paramètres du compte en mode sombre.',
      howToTest: darkHow('« Paramètres »'),
    }),
    make('en-dashboard', 'dashboard', {
      section: S.en,
      locale: 'en',
      title: 'Tableau de bord en anglais',
      caption: 'Le tableau de bord avec l’interface en anglais.',
      howToTest: [
        'Dans Paramètres → Profil, choisir la langue « English ».',
        'Ouvrir le tableau de bord.',
        'Résultat attendu : tous les libellés sont en anglais, aucun texte technique (clé de traduction) visible.',
      ],
    }),
    make('en-map-insights', 'map-insights-nord', {
      section: S.en,
      locale: 'en',
      title: 'Conseil d’irrigation en anglais',
      caption:
        'Le panneau Conseil en anglais. Les messages agronomiques calculés par le serveur restent en français pour l’instant.',
      howToTest: [
        'Langue « English », ouvrir la carte, cliquer sur « Parcelle Nord ».',
        'Résultat attendu : titres et étiquettes en anglais ; les phrases de recommandation sont en français (limite connue).',
      ],
    }),
    make('en-water', 'water', {
      section: S.en,
      locale: 'en',
      title: 'Eau en anglais',
      caption: 'Les sources d’eau avec l’interface en anglais.',
      howToTest: [
        'Langue « English », ouvrir « Eau ».',
        'Résultat attendu : libellés en anglais, unités (m, m³, %) inchangées.',
      ],
    }),
    make('tablet-dashboard', 'dashboard', {
      section: S.tablet,
      viewport: 'tablet',
      title: 'Tableau de bord sur tablette',
      caption: 'Le tableau de bord sur une tablette en portrait (820 × 1180).',
      howToTest: [
        'Ouvrir l’application sur une tablette en portrait.',
        'Résultat attendu : menu accessible, cartes empilées proprement, aucun défilement horizontal.',
      ],
    }),
    make('tablet-map', 'map-overview', {
      section: S.tablet,
      viewport: 'tablet',
      title: 'Carte sur tablette',
      caption: 'La carte de la ferme sur tablette.',
      howToTest: [
        'Sur tablette, ouvrir la carte.',
        'Résultat attendu : la carte occupe l’écran, les boutons d’outils restent utilisables au doigt.',
      ],
    }),
    make('tablet-water', 'water', {
      section: S.tablet,
      viewport: 'tablet',
      title: 'Eau sur tablette',
      caption: 'Les sources d’eau sur tablette.',
      howToTest: [
        'Sur tablette, ouvrir « Eau ».',
        'Résultat attendu : la jauge et le simulateur tiennent sans zoom.',
      ],
    }),
    make('ar-mobile-dashboard', 'ar-dashboard', {
      section: S.rtl,
      viewport: 'mobile',
      title: 'Tableau de bord en arabe sur téléphone',
      caption: 'Le tableau de bord en arabe (droite à gauche) sur téléphone.',
      howToTest: [
        'Langue arabe, sur téléphone, ouvrir le tableau de bord.',
        'Résultat attendu : lecture de droite à gauche, menu à droite, aucun texte coupé.',
      ],
    }),
    make('dark-mobile-map-insights', 'mobile-map-insights', {
      section: S.dark,
      theme: 'dark',
      title: 'Conseil sur téléphone — mode sombre',
      caption: 'Le panneau Conseil d’un secteur sur téléphone, en mode sombre.',
      howToTest: darkHow(
        'la carte sur téléphone, puis toucher « Parcelle Nord »'
      ),
    }),
  ];
}

/** French catalogue text, for expectations that are always French. */
function msgText(key: string): string {
  return msg('fr', key);
}
