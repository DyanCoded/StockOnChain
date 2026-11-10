/**
 * @stockonchain/chain
 * Stellar SDK bindings, Soroban RPC connection, and contract clients.
 */

export const TESTNET_PASSPHRASE = 'Test SDF Network ; September 2015';

export const STELLAR_NETWORKS = {
  testnet: {
    networkPassphrase: TESTNET_PASSPHRASE,
    rpcUrl: 'https://soroban-testnet.stellar.org',
    horizonUrl: 'https://horizon-testnet.stellar.org',
  },
} as const;

export function assertTestnetConfiguration(
  env: NodeJS.ProcessEnv = process.env,
): void {
  if (env.STELLAR_NETWORK !== 'testnet') {
    throw new Error('STELLAR_NETWORK must be explicitly set to testnet.');
  }
  if (env.STELLAR_NETWORK_PASSPHRASE !== TESTNET_PASSPHRASE) {
    throw new Error('STELLAR_NETWORK_PASSPHRASE does not match Stellar Testnet.');
  }
}

export interface StokvelRoles {
  admin: string;
  issuer: string;
  dealer: string;
  custodian: string;
  sponsor: string;
}

export interface ContractConfig {
  contractId: string;
  network: 'testnet';
}
