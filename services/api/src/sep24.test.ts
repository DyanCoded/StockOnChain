import test from "node:test";
import assert from "node:assert/strict";
import { Keypair, TransactionBuilder, Networks } from "@stellar/stellar-sdk";
import { Sep24Simulator } from "./sep24.js";

test("SEP-10 Challenge & Token verification - rejects unsigned and accepts client-signed challenge", () => {
  const serverKp = Keypair.random();
  const clientKp = Keypair.random();
  const simulator = new Sep24Simulator({
    serverKeypair: serverKp,
    homeDomain: "stockonchain.test",
  });

  const challenge = simulator.buildChallengeTransaction(clientKp.publicKey());
  assert.ok(challenge.transaction);
  assert.equal(challenge.network_passphrase, Networks.TESTNET);

  // Without client signature, verification MUST throw
  assert.throws(
    () => simulator.verifyChallenge(challenge.transaction, clientKp.publicKey()),
    /Client account signature is missing or invalid/,
  );

  // Client signs the challenge transaction
  const clientTx = TransactionBuilder.fromXDR(
    challenge.transaction,
    Networks.TESTNET,
  );
  clientTx.sign(clientKp);

  // Verification succeeds and returns token
  const token = simulator.verifyChallenge(clientTx.toXDR(), clientKp.publicKey());
  assert.ok(token);

  // Verify token
  const payload = simulator.verifyToken(token);
  assert.equal(payload.sub, clientKp.publicKey());
  assert.equal(payload.iss, "https://stockonchain.test");
});

test("SEP-24 Info endpoint - returns asset limits, fees, and feature flags", () => {
  const serverKp = Keypair.random();
  const simulator = new Sep24Simulator({ serverKeypair: serverKp });
  const info = simulator.getInfo();

  assert.equal(info.deposit.mZAR.enabled, true);
  assert.equal(info.withdraw.mZAR.enabled, true);
  assert.equal(info.withdraw.mZAR.fee_fixed, 2.5);
  assert.equal(info.withdraw.mZAR.fee_percent, 0.5);
  assert.equal(info.withdraw.mZAR.min_amount, 10.0);
});

test("Payout Quote - calculates clear fees, net payout, and time-to-cash estimate", () => {
  const serverKp = Keypair.random();
  const simulator = new Sep24Simulator({ serverKeypair: serverKp });

  const quoteBank = simulator.quotePayout({
    rail: "instant_bank",
    recipient: "1234567890",
    amountMzar: 1000,
  });

  // Fixed: 2.50, Percent: 0.5% (5.00) => Total: 7.50
  assert.equal(quoteBank.fixedFeeMzar, 2.5);
  assert.equal(quoteBank.percentFeeMzar, 5.0);
  assert.equal(quoteBank.totalFeeMzar, 7.5);
  assert.equal(quoteBank.netPayoutMzar, 992.5);
  assert.equal(quoteBank.estimatedTimeToCashSeconds, 30);
  assert.equal(quoteBank.simulated, true);
  assert.match(quoteBank.disclaimer, /SIMULATION ONLY/);

  const quoteMobile = simulator.quotePayout({
    rail: "mobile_money",
    recipient: "0820000000",
    amountMzar: 200,
  });

  // Fixed: 1.50, Percent: 0.75% of 200 = 1.50 => Total: 3.00
  assert.equal(quoteMobile.fixedFeeMzar, 1.5);
  assert.equal(quoteMobile.percentFeeMzar, 1.5);
  assert.equal(quoteMobile.totalFeeMzar, 3.0);
  assert.equal(quoteMobile.netPayoutMzar, 197.0);
  assert.equal(quoteMobile.estimatedTimeToCashSeconds, 15);
});

test("SEP-24 Interactive Withdrawal Lifecycle - initiates, queries, and executes simulated payout", () => {
  const serverKp = Keypair.random();
  const clientKp = Keypair.random();
  const simulator = new Sep24Simulator({
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

  assert.ok(init.id.startsWith("soc_w_"));
  assert.ok(init.url.includes(`/cashout?transaction_id=${init.id}`));

  const txInitial = simulator.getTransaction(init.id);
  assert.ok(txInitial);
  assert.equal(txInitial?.status, "pending_user_transfer_start");
  assert.equal(txInitial?.amount_in, "500");
  assert.equal(txInitial?.withdraw_anchor_account, serverKp.publicKey());

  // Execute payout simulation
  const completedTx = simulator.executeSimulatedPayout(
    init.id,
    "mock_stellar_tx_hash_12345",
  );
  assert.equal(completedTx.status, "completed");
  assert.equal(completedTx.stellar_transaction_id, "mock_stellar_tx_hash_12345");
  assert.ok(completedTx.external_transaction_id?.startsWith("sim_payout_"));
  assert.ok(completedTx.completed_at);
});

test("SEP-24 Deposit Path - provides optional interactive deposit session", () => {
  const serverKp = Keypair.random();
  const clientKp = Keypair.random();
  const simulator = new Sep24Simulator({ serverKeypair: serverKp });

  const dep = simulator.initiateDeposit({
    account: clientKp.publicKey(),
    amount: "250",
    asset_code: "mZAR",
  });

  assert.ok(dep.id.startsWith("soc_d_"));
  const record = simulator.getTransaction(dep.id);
  assert.equal(record?.kind, "deposit");
  assert.equal(record?.status, "pending_anchor");
  assert.equal(record?.amount_in, "250");
});
