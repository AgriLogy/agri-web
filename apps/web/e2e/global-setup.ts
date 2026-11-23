import { API_URL, seedTenants } from './seed';

/** Fail fast with a clear message when the web app or the API is down. */
export async function checkStack(): Promise<void> {
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
}

export default async function globalSetup(): Promise<void> {
  await checkStack();
  seedTenants();
}
