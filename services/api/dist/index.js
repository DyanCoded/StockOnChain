"use strict";
/**
 * @stockonchain/api
 * Backend service for verification, transaction fee sponsorship (Sponsor role), and simulation.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNetworkConfig = getNetworkConfig;
const dotenv_1 = require("dotenv");
const chain_1 = require("@stockonchain/chain");
(0, dotenv_1.config)({ quiet: true });
(0, chain_1.assertTestnetConfiguration)();
function getNetworkConfig() {
    (0, chain_1.assertTestnetConfiguration)();
    return chain_1.STELLAR_NETWORKS.testnet;
}
console.log('StockOnChain API service initialized.');
