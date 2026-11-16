import { API_URL, runSeed, saveSeed, type Seed } from './seed';

export default async function globalSetup(): Promise<void> {
  const base = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
  for (const [name, url] of [
    ['web', base],
    ['api', `${API_URL}/zones`],
  ]) {
    try {
      await fetch(url);
    } catch {
      throw new Error(
        `E2E: ${name} not reachable at ${url}. Start the local stack first.`
      );
    }
  }
  // Clear leftovers from an aborted run, then create this run's tenants.
  runSeed('--cleanup');
  const seed = JSON.parse(runSeed()) as Seed;
  saveSeed(seed);
}
