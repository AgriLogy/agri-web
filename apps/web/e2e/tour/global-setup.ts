import { mkdirSync } from 'node:fs';
import { checkStack } from '../global-setup';
import { seedTenants } from '../seed';

/** Tour setup: same stack check, tenants + farmer A's demo farm. */
export default async function tourSetup(): Promise<void> {
  await checkStack();
  seedTenants({ demo: true });
  mkdirSync(process.env.TOUR_RUN_DIR!, { recursive: true });
}
