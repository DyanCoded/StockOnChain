"use strict";
/**
 * @stockonchain/chain
 * Stellar SDK bindings, Soroban RPC connection, and contract clients.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.STELLAR_NETWORKS = exports.TESTNET_PASSPHRASE = void 0;
exports.assertTestnetConfiguration = assertTestnetConfiguration;
exports.TESTNET_PASSPHRASE = 'Test SDF Network ; September 2015';
exports.STELLAR_NETWORKS = {
    testnet: {
        networkPassphrase: exports.TESTNET_PASSPHRASE,
        rpcUrl: 'https://soroban-testnet.stellar.org',
        horizonUrl: 'https://horizon-testnet.stellar.org',
    },
};
function assertTestnetConfiguration(env = process.env) {
    if (env.STELLAR_NETWORK !== 'testnet') {
        throw new Error('STELLAR_NETWORK must be explicitly set to testnet.');
    }
    if (env.STELLAR_NETWORK_PASSPHRASE !== exports.TESTNET_PASSPHRASE) {
        throw new Error('STELLAR_NETWORK_PASSPHRASE does not match Stellar Testnet.');
    }
}
