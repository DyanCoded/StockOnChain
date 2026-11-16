import assert from "node:assert/strict";
import test from "node:test";
import { executeMemberClaim, getClaimBreakdown } from "./redeem";

test("redeem - getClaimBreakdown calculates principal, yield, and total payout accurately", () => {
  const breakdown = getClaimBreakdown({
    principalContributed: 200,
    annualizedRate: 0.0825,
    termDays: 91,
    potState: "Matured",
    hasClaimed: false,
  });

  assert.equal(breakdown.isMatured, true);
  assert.equal(breakdown.principalContributedMzar, 200);
  assert.equal(breakdown.accumulatedYieldMzar, 4.11);
  assert.equal(breakdown.totalPayoutMzar, 204.11);
  assert.match(breakdown.totalPayoutFormatted, /R\s?204,11/);

  // Also verify passing ClaimBreakdown property names directly
  const breakdownInvested = getClaimBreakdown({
    potLifecycleState: "Invested",
    timeRemainingSeconds: 120,
    principalContributedMzar: 200,
    hasClaimed: false,
  });
  assert.equal(breakdownInvested.potLifecycleState, "Invested");
  assert.equal(breakdownInvested.isMatured, false);
  assert.equal(breakdownInvested.timeRemainingSeconds, 120);
});

test("redeem - surfaces plain-language explanation block when early claim is attempted before maturity", async () => {
  const breakdown = getClaimBreakdown({
    potState: "Invested",
    timeRemainingSeconds: 95,
  });

  assert.equal(breakdown.isMatured, false);
  const res = await executeMemberClaim({ breakdown });

  assert.equal(res.success, false);
  assert.equal(res.error?.code, "NOT_MATURED");
  assert.equal(res.error?.title, "Pot Has Not Reached Maturity");
  assert.match(res.error?.userMessage || "", /not reached its maturity date yet/i);
  assert.match(res.error?.remedy || "", /Wait until the maturity timestamp/i);
});

test("redeem - prevents duplicate claims when share has already been claimed", async () => {
  const breakdown = getClaimBreakdown({
    potState: "Settled",
    hasClaimed: true,
  });

  const res = await executeMemberClaim({ breakdown });
  assert.equal(res.success, false);
  assert.equal(res.error?.code, "ALREADY_CLAIMED");
  assert.match(res.error?.title || "", /Already Claimed/i);
});

test("redeem - executes valid member claim successfully with receipt and explorer URL", async () => {
  const breakdown = getClaimBreakdown({
    potState: "Matured",
    hasClaimed: false,
    principalContributed: 200,
  });

  const res = await executeMemberClaim({ breakdown });
  assert.equal(res.success, true);
  assert.ok(res.receipt);
  assert.equal(res.receipt?.claimedMzar, 204.11);
  assert.match(res.receipt?.explorerUrl || "", /stellar\.expert/i);
  assert.equal(res.receipt?.payoutStatus, "claimed_to_wallet");
});
