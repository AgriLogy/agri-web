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

export interface Seed {
  run: string;
  readings_seeded: number;
  users: { a: SeedUser; b: SeedUser; tech: SeedUser };
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

export function saveSeed(seed: Seed): void {
  mkdirSync(path.dirname(SEED_FILE), { recursive: true });
  writeFileSync(SEED_FILE, JSON.stringify(seed));
}

export function loadSeed(): Seed {
  return JSON.parse(readFileSync(SEED_FILE, 'utf8')) as Seed;
}
