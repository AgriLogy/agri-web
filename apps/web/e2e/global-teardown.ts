import { runSeed } from './seed';

export default async function globalTeardown(): Promise<void> {
  if (process.env.E2E_KEEP_DATA === '1') return;
  runSeed('--cleanup');
}
