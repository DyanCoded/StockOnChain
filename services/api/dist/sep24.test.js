"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const stellar_sdk_1 = require("@stellar/stellar-sdk");
const sep24_js_1 = require("./sep24.js");
(0, node_test_1.default)("SEP-10 Challenge & Token verification - rejects unsigned and accepts client-signed challenge", () => {
    const serverKp = stellar_sdk_1.Keypair.random();
    const clientKp = stellar_sdk_1.Keypair.random();
    const simulator = new sep24_js_1.Sep24Simulator({
        serverKeypair: serverKp,
        homeDomain: "stockonchain.test",
    });
    const challenge = simulator.buildChallengeTransaction(clientKp.publicKey());
    strict_1.default.ok(challenge.transaction);
    strict_1.default.equal(challenge.network_passphrase, stellar_sdk_1.Networks.TESTNET);
    // Without client signature, verification MUST throw
    strict_1.default.throws(() => simulator.verifyChallenge(challenge.transaction, clientKp.publicKey()), /Client account signature is missing or invalid/);
    // Client signs the challenge transaction
    const clientTx = stellar_sdk_1.TransactionBuilder.fromXDR(challenge.transaction, stellar_sdk_1.Networks.TESTNET);
    clientTx.sign(clientKp);
    // Verification succeeds and returns token
    const token = simulator.verifyChallenge(clientTx.toXDR(), clientKp.publicKey());
    strict_1.default.ok(token);
    // Verify token
    const payload = simulator.verifyToken(token);
    strict_1.default.equal(payload.sub, clientKp.publicKey());
    strict_1.default.equal(payload.iss, "https://stockonchain.test");
});
(0, node_test_1.default)("SEP-24 Info endpoint - returns asset limits, fees, and feature flags", () => {
    const serverKp = stellar_sdk_1.Keypair.random();
    const simulator = new sep24_js_1.Sep24Simulator({ serverKeypair: serverKp });
    const info = simulator.getInfo();
    strict_1.default.equal(info.deposit.mZAR.enabled, true);
    strict_1.default.equal(info.withdraw.mZAR.enabled, true);
    strict_1.default.equal(info.withdraw.mZAR.fee_fixed, 2.5);
    strict_1.default.equal(info.withdraw.mZAR.fee_percent, 0.5);
    strict_1.default.equal(info.withdraw.mZAR.min_amount, 10.0);
});
(0, node_test_1.default)("Payout Quote - calculates clear fees, net payout, and time-to-cash estimate", () => {
    const serverKp = stellar_sdk_1.Keypair.random();
    const simulator = new sep24_js_1.Sep24Simulator({ serverKeypair: serverKp });
    const quoteBank = simulator.quotePayout({
        rail: "instant_bank",
        recipient: "1234567890",
        amountMzar: 1000,
    });
    // Fixed: 2.50, Percent: 0.5% (5.00) => Total: 7.50
    strict_1.default.equal(quoteBank.fixedFeeMzar, 2.5);
    strict_1.default.equal(quoteBank.percentFeeMzar, 5.0);
    strict_1.default.equal(quoteBank.totalFeeMzar, 7.5);
    strict_1.default.equal(quoteBank.netPayoutMzar, 992.5);
    strict_1.default.equal(quoteBank.estimatedTimeToCashSeconds, 30);
    strict_1.default.equal(quoteBank.simulated, true);
    strict_1.default.match(quoteBank.disclaimer, /SIMULATION ONLY/);
    const quoteMobile = simulator.quotePayout({
        rail: "mobile_money",
        recipient: "0820000000",
        amountMzar: 200,
    });
    // Fixed: 1.50, Percent: 0.75% of 200 = 1.50 => Total: 3.00
    strict_1.default.equal(quoteMobile.fixedFeeMzar, 1.5);
    strict_1.default.equal(quoteMobile.percentFeeMzar, 1.5);
    strict_1.default.equal(quoteMobile.totalFeeMzar, 3.0);
    strict_1.default.equal(quoteMobile.netPayoutMzar, 197.0);
    strict_1.default.equal(quoteMobile.estimatedTimeToCashSeconds, 15);
});
(0, node_test_1.default)("SEP-24 Interactive Withdrawal Lifecycle - initiates, queries, and executes simulated payout", () => {
    const serverKp = stellar_sdk_1.Keypair.random();
    const clientKp = stellar_sdk_1.Keypair.random();
    const simulator = new sep24_js_1.Sep24Simulator({
        serverKeypair: serverKp,
        homeDomain: "stockonchain.test",
    });
    const init = simulator.initiateWithdrawal({
        account: clientKp.publicKey(),
        amount: "500",
        asset_code: "mZAR",
        rail: "instant_bank",
        recipient: "1122334455",
    });
    strict_1.default.ok(init.id.startsWith("soc_w_"));
    strict_1.default.ok(init.url.includes(`/cashout?transaction_id=${init.id}`));
    const txInitial = simulator.getTransaction(init.id);
    strict_1.default.ok(txInitial);
    strict_1.default.equal(txInitial?.status, "pending_user_transfer_start");
    strict_1.default.equal(txInitial?.amount_in, "500");
    strict_1.default.equal(txInitial?.withdraw_anchor_account, serverKp.publicKey());
    // Execute payout simulation
    const completedTx = simulator.executeSimulatedPayout(init.id, "mock_stellar_tx_hash_12345");
    strict_1.default.equal(completedTx.status, "completed");
    strict_1.default.equal(completedTx.stellar_transaction_id, "mock_stellar_tx_hash_12345");
    strict_1.default.ok(completedTx.external_transaction_id?.startsWith("sim_payout_"));
    strict_1.default.ok(completedTx.completed_at);
});
(0, node_test_1.default)("SEP-24 Deposit Path - provides optional interactive deposit session", () => {
    const serverKp = stellar_sdk_1.Keypair.random();
    const clientKp = stellar_sdk_1.Keypair.random();
    const simulator = new sep24_js_1.Sep24Simulator({ serverKeypair: serverKp });
    const dep = simulator.initiateDeposit({
        account: clientKp.publicKey(),
        amount: "250",
        asset_code: "mZAR",
    });
    strict_1.default.ok(dep.id.startsWith("soc_d_"));
    const record = simulator.getTransaction(dep.id);
    strict_1.default.equal(record?.kind, "deposit");
    strict_1.default.equal(record?.status, "pending_anchor");
    strict_1.default.equal(record?.amount_in, "250");
});
