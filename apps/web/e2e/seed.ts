import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

export interface SeedUser {
  id: number;
  username: string;
  access: string;
  refresh: string;
  zones?: { id: number; name: string }[];
  owner_id?: number;
}

/** Extra demo data on farmer A, created by `e2e_seed.py --demo`. */
export interface DemoSeed {
  sectors: { id: number; name: string }[];
  kc_id: number;
  ndvi_points: number;
  water_source_id: number;
}

export interface Seed {
  run: string;
  readings_seeded: number;
  users: { a: SeedUser; b: SeedUser; tech: SeedUser };
  /** Present only when seeded with `{ demo: true }`. */
  demo?: DemoSeed;
}

const SEED_FILE = path.join(__dirname, '..', 'e2e-results', 'seed.json');

export const SEED_CMD =
  process.env.E2E_SEED_CMD ??
  'docker exec agri-api-web python scripts/e2e_seed.py';

export const API_URL = process.env.E2E_API_URL ?? 'http://localhost:8080';

export function runSeed(args = ''): string {
  return execSync(`${SEED_CMD} ${args}`.trim(), {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
    timeout: 240_000,
  });
}

/**
 * Clear leftovers from an aborted run, then create this run's tenants.
 * `demo` adds farmer A's demo farm (sectors, Kc table, NDVI history, basin)
 * used by the screenshot tour.
 */
export function seedTenants(opts: { demo?: boolean } = {}): Seed {
  runSeed('--cleanup');
  const seed = JSON.parse(runSeed(opts.demo ? '--demo' : '')) as Seed;
  saveSeed(seed);
  return seed;
}

export function saveSeed(seed: Seed): void {
  mkdirSync(path.dirname(SEED_FILE), { recursive: true });
  writeFileSync(SEED_FILE, JSON.stringify(seed));
}

export function loadSeed(): Seed {
  return JSON.parse(readFileSync(SEED_FILE, 'utf8')) as Seed;
}
