/**
 * @stockonchain/chain
 * Stellar SDK bindings, Soroban RPC connection, and contract clients.
 */

export const STELLAR_NETWORKS = {
  testnet: {
    networkPassphrase: 'Test SDF Network ; September 2015',
    rpcUrl: 'https://soroban-testnet.stellar.org',
    horizonUrl: 'https://horizon-testnet.stellar.org',
  },
  mainnet: {
    networkPassphrase: 'Public Global Stellar Network ; July 2015',
    rpcUrl: 'https://mainnet.sorobanrpc.com',
    horizonUrl: 'https://horizon.stellar.org',
  },
} as const;

export interface StokvelRoles {
  admin: string;
  issuer: string;
  dealer: string;
  custodian: string;
  sponsor: string;
}

export interface ContractConfig {
  contractId: string;
  network: keyof typeof STELLAR_NETWORKS;
}

