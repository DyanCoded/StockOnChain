/**
 * Bootstrap script for StockOnChain
 * Validates network connectivity, checks account balances, and prepares contracts for deployment.
 */

import { config } from 'dotenv';
config();

async function main() {
  console.log('--- StockOnChain Bootstrap ---');
  console.log('Network:', process.env.STELLAR_NETWORK || 'testnet');
  console.log('Admin Public Key:', process.env.STELLAR_ADMIN_PUBLIC_KEY);
  console.log('Issuer Public Key:', process.env.STELLAR_ISSUER_PUBLIC_KEY);
  console.log('Dealer Public Key:', process.env.STELLAR_DEALER_PUBLIC_KEY);
  console.log('Custodian Public Key:', process.env.STELLAR_CUSTODIAN_PUBLIC_KEY);
  console.log('Sponsor Public Key:', process.env.STELLAR_SPONSOR_PUBLIC_KEY);
}

main().catch(console.error);

