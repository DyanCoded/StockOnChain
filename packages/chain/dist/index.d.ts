/**
 * @stockonchain/chain
 * Stellar SDK bindings, Soroban RPC connection, and contract clients.
 */
export declare const TESTNET_PASSPHRASE = "Test SDF Network ; September 2015";
export declare const STELLAR_NETWORKS: {
    readonly testnet: {
        readonly networkPassphrase: "Test SDF Network ; September 2015";
        readonly rpcUrl: "https://soroban-testnet.stellar.org";
        readonly horizonUrl: "https://horizon-testnet.stellar.org";
    };
};
export declare function assertTestnetConfiguration(env?: NodeJS.ProcessEnv): void;
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
export * from './dealer';
