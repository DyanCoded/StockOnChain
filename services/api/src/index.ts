/**
 * @stockonchain/api
 * Backend service for verification, transaction fee sponsorship (Sponsor role), and simulation.
 */

import { STELLAR_NETWORKS } from '@stockonchain/chain';

export function getNetworkConfig() {
  const network = (process.env.STELLAR_NETWORK as keyof typeof STELLAR_NETWORKS) || 'testnet';
  return STELLAR_NETWORKS[network];
}

console.log('StockOnChain API service initialized.');

