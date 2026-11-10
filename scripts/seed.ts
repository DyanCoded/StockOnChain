/**
 * Seed script for StockOnChain
 * Seeds initial mock data, test users, or initial contract state for local and testnet environments.
 */

import { config } from 'dotenv';
import { assertTestnetConfiguration } from '../packages/chain/src/index.js';
config();

async function main() {
  assertTestnetConfiguration();
  console.log('--- StockOnChain Seed Script ---');
  console.log('Seeding initial Stokvel Pot configurations...');
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Seed script failed.');
  process.exitCode = 1;
});
