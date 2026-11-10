/**
 * @stockonchain/api
 * Backend service for verification, transaction fee sponsorship (Sponsor role), and simulation.
 */

import { config } from 'dotenv';
import {
  assertTestnetConfiguration,
  STELLAR_NETWORKS,
} from '@stockonchain/chain';

config({ quiet: true });
assertTestnetConfiguration();

export function getNetworkConfig() {
  assertTestnetConfiguration();
  return STELLAR_NETWORKS.testnet;
}

console.log('StockOnChain API service initialized.');
