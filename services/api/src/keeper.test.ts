import test from "node:test";
import assert from "node:assert/strict";
import { KeeperService } from "./keeper.js";

test("KeeperService - full hands-off lifecycle execution from open to invest to settle and claim", async () => {
  const keeper = new KeeperService();

  // Initial state is open
  const initial = keeper.getStatus();
  assert.equal(initial.lifecycleState, "open");
  assert.equal(initial.step, "idle");

  // Step 1: Execute Buy Window & Invest
  await keeper.executeCycleStep();
  const invested = keeper.getStatus();
  assert.equal(invested.lifecycleState, "invested");
  assert.equal(invested.step, "waiting_for_maturity");
  assert.ok(invested.timeRemainingSeconds > 0);

  // Fast forward maturity to simulate passage of time
  const ffRes = keeper.fastForwardMaturity(130);
  assert.equal(ffRes.success, true);
  assert.equal(ffRes.timeRemainingSeconds, 0);

  // Step 2: Mature & Settle
  await keeper.executeCycleStep();
  const settled = keeper.getStatus();
  assert.equal(settled.lifecycleState, "settled");
  assert.equal(settled.step, "claiming");

  // Step 3: Complete Claims
  await keeper.executeCycleStep();
  const completed = keeper.getStatus();
  assert.equal(completed.lifecycleState, "closed");
  assert.equal(completed.step, "completed");
  assert.ok(completed.history.length >= 4);
});

test("KeeperService - single-step demo reset restores clean baseline seed state", async () => {
  const keeper = new KeeperService();

  // Fast forward and run cycles
  keeper.fastForwardMaturity(200);
  await keeper.executeCycleStep();
  await keeper.executeCycleStep();

  // Execute reset
  const resetRes = keeper.resetDemoState();
  assert.equal(resetRes.success, true);

  const resetStatus = keeper.getStatus();
  assert.equal(resetStatus.lifecycleState, "open");
  assert.equal(resetStatus.step, "idle");
  assert.equal(resetStatus.timeRemainingSeconds, 120);
  assert.equal(resetStatus.retries, 0);
});
