import assert from "node:assert/strict";
import test from "node:test";
import {
  executeContribution,
  executeTopUp,
  getContributeState,
} from "./contribute";

test("contribute - getContributeState calculates remaining cap and state correctly", () => {
  const state = getContributeState({
    walletBalance: 150,
    contributedSoFar: 200,
    memberCap: 300,
    potState: "Open",
    currentPotTotal: 750,
  });

  assert.equal(state.walletBalanceMzar, 150);
  assert.equal(state.memberContributionMzar, 200);
  assert.equal(state.memberCapMzar, 300);
  assert.equal(state.remainingCapMzar, 100);
  assert.equal(state.isWindowOpen, true);
  assert.equal(state.isVerified, true);
});

test("contribute - executeTopUp simulates fast testnet faucet funding", async () => {
  const res = await executeTopUp("GABC12345", 100);
  assert.equal(res.success, true);
  assert.equal(res.newBalanceMzar, 100);
  assert.match(res.txHash, /^tx_topup_/);
});

test("contribute - rejects unverified user with plain-language remedy (A-01)", async () => {
  const state = getContributeState({ isVerified: false });
  const res = await executeContribution({ amountMzar: 50, state });

  assert.equal(res.success, false);
  assert.equal(res.error?.code, "UNVERIFIED_TRANSFER");
  assert.match(res.error?.userMessage || "", /compliance verification/i);
  assert.match(res.error?.remedy || "", /KYC/i);
});

test("contribute - rejects contribution when pot investment window is closed", async () => {
  const state = getContributeState({ potState: "Invested" });
  const res = await executeContribution({ amountMzar: 50, state });

  assert.equal(res.success, false);
  assert.equal(res.error?.code, "WRONG_STATE");
  assert.match(res.error?.title || "", /Invalid Pot State/i);
  assert.match(res.error?.remedy || "", /Open/i);
});

test("contribute - rejects contribution exceeding per-member cap", async () => {
  const state = getContributeState({
    walletBalance: 200,
    contributedSoFar: 250,
    memberCap: 300, // only 50 remaining
  });
  const res = await executeContribution({ amountMzar: 75, state });

  assert.equal(res.success, false);
  assert.equal(res.error?.code, "OVER_CAP");
  assert.match(res.error?.title || "", /Cap Exceeded/i);
  assert.match(res.error?.remedy || "", /Reduce your contribution/i);
});

test("contribute - rejects contribution when wallet balance is insufficient with top-up remedy", async () => {
  const state = getContributeState({
    walletBalance: 20,
    contributedSoFar: 100,
    memberCap: 500,
  });
  const res = await executeContribution({ amountMzar: 50, state });

  assert.equal(res.success, false);
  assert.match(res.error?.title || "", /Insufficient/i);
  assert.match(res.error?.remedy || "", /top-up/i);
});

test("contribute - executes valid one-tap contribution and updates member share percentage", async () => {
  const state = getContributeState({
    walletBalance: 200,
    contributedSoFar: 200,
    memberCap: 300,
    currentPotTotal: 750,
  });

  const res = await executeContribution({ amountMzar: 50, state });

  assert.equal(res.success, true);
  assert.ok(res.receipt);
  assert.equal(res.receipt?.amountMzar, 50);
  assert.equal(res.receipt?.newMemberTotalMzar, 250);
  // (250 / 800) * 100 = 31.25%
  assert.equal(res.receipt?.newSharePercent, 31.3);
  assert.match(res.receipt?.explorerUrl || "", /stellar\.expert/i);
  assert.equal(res.receipt?.status, "confirmed");
});
