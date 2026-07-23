/**
 * App sitemap — the canonical list of navigable pages, surfaced by the
 * assistant's /sitemap command. Paths are stable; user-facing label and
 * description are resolved via i18n keys (misc.chatbot.route.KEY.label /
 * .description) so the card stays localized (fr / en / ar).
 *
 * Keep this in sync with the page routes under src/app. /login is
 * intentionally excluded (not a destination the assistant should suggest).
 */
export interface SitemapRoute {
  path: string;
  /** i18n key segment under misc.chatbot.route (e.g. "dashboard"). */
  key: string;
  icon: string;
}

export const SITEMAP_ROUTES: SitemapRoute[] = [
  { path: '/', key: 'dashboard', icon: '🏠' },
  { path: '/soil', key: 'soil', icon: '🌱' },
  { path: '/station', key: 'station', icon: '🌤️' },
  { path: '/plant', key: 'plant', icon: '🌿' },
  { path: '/water', key: 'water', icon: '💧' },
  { path: '/vannes-pompes', key: 'vannesPompes', icon: '🚰' },
  { path: '/alerts', key: 'alerts', icon: '🔔' },
  { path: '/notifications', key: 'notifications', icon: '📩' },
  { path: '/reports', key: 'reports', icon: '📄' },
  { path: '/settings', key: 'settings', icon: '⚙️' },
];
