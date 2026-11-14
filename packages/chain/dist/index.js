"use strict";
/**
 * @stockonchain/chain
 * Stellar SDK bindings, Soroban RPC connection, and contract clients.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
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
__exportStar(require("./dealer"), exports);
__exportStar(require("./attestation"), exports);
__exportStar(require("./errors"), exports);
__exportStar(require("./pot-dashboard"), exports);
__exportStar(require("./pot-create-join"), exports);
__exportStar(require("./models"), exports);
__exportStar(require("./format"), exports);
__exportStar(require("./mock-fixtures"), exports);
__exportStar(require("./retry"), exports);
__exportStar(require("./contribute"), exports);
