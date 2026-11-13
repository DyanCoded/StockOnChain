import test from "node:test";
import assert from "node:assert/strict";
import {
  runSecurityFailureSuite,
  testUnverifiedTransfer,
  testFrozenAccount,
  testNonMemberContribution,
  testOverCapDeposit,
  testEarlyClaim,
  testDoubleClaim,
  testWrongNetworkExecution,
} from "./demo-fail";

test("FAIL-01: Unverified transfer correctly reverts and maps to UNVERIFIED_TRANSFER", async () => {
  const result = await testUnverifiedTransfer();
  assert.equal(result.scenarioId, "FAIL-01");
  assert.equal(result.expectedCode, "UNVERIFIED_TRANSFER");
  assert.equal(result.reverted, true);
  assert.equal(result.passed, true);
  assert.ok(result.safeError.userMessage.length > 20);
  assert.ok(result.safeError.remedy.length > 10);
});

test("FAIL-02: Frozen account transfer correctly reverts and maps to FROZEN_ACCOUNT", async () => {
  const result = await testFrozenAccount();
  assert.equal(result.scenarioId, "FAIL-02");
  assert.equal(result.expectedCode, "FROZEN_ACCOUNT");
  assert.equal(result.reverted, true);
  assert.equal(result.passed, true);
  assert.ok(result.safeError.userMessage.includes("frozen or revoked"));
});

test("FAIL-03: Non-member contribution correctly reverts and maps to NOT_MEMBER", async () => {
  const result = await testNonMemberContribution();
  assert.equal(result.scenarioId, "FAIL-03");
  assert.equal(result.expectedCode, "NOT_MEMBER");
  assert.equal(result.reverted, true);
  assert.equal(result.passed, true);
  assert.ok(result.safeError.userMessage.includes("not an approved member"));
});

test("FAIL-04: Over-cap deposit correctly reverts and maps to OVER_CAP", async () => {
  const result = await testOverCapDeposit();
  assert.equal(result.scenarioId, "FAIL-04");
  assert.equal(result.expectedCode, "OVER_CAP");
  assert.equal(result.reverted, true);
  assert.equal(result.passed, true);
  assert.ok(result.safeError.userMessage.includes("deposit cap"));
});

test("FAIL-05: Early claim correctly reverts and maps to NOT_MATURED", async () => {
  const result = await testEarlyClaim();
  assert.equal(result.scenarioId, "FAIL-05");
  assert.equal(result.expectedCode, "NOT_MATURED");
  assert.equal(result.reverted, true);
  assert.equal(result.passed, true);
  assert.ok(result.safeError.userMessage.includes("maturity"));
});

test("FAIL-06: Double claim correctly reverts and maps to ALREADY_CLAIMED", async () => {
  const result = await testDoubleClaim();
  assert.equal(result.scenarioId, "FAIL-06");
  assert.equal(result.expectedCode, "ALREADY_CLAIMED");
  assert.equal(result.reverted, true);
  assert.equal(result.passed, true);
  assert.ok(result.safeError.userMessage.includes("Duplicate claims are strictly prohibited"));
});

test("FAIL-07: Wrong network execution correctly throws and maps to WRONG_NETWORK", async () => {
  const result = await testWrongNetworkExecution();
  assert.equal(result.scenarioId, "FAIL-07");
  assert.equal(result.expectedCode, "WRONG_NETWORK");
  assert.equal(result.reverted, true);
  assert.equal(result.passed, true);
  assert.ok(result.safeError.userMessage.includes("Testnet"));
});

test("Full security failure suite executes and reports all safe failures verified", async () => {
  const { allPassed, results } = await runSecurityFailureSuite();
  assert.equal(allPassed, true);
  assert.equal(results.length, 7);
  for (const r of results) {
    assert.equal(r.passed, true);
  }
});
