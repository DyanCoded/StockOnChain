import assert from "node:assert/strict";
import test from "node:test";
import { GET } from "./route";

test("Health check route returns status 200 and healthy checks on Testnet", async () => {
  const response = await GET();
  assert.equal(response.status, 200);

  const data = await response.json();
  assert.equal(data.status, "ok");
  assert.equal(data.environment, "stellar-testnet-prototype");
  assert.equal(data.checks.testnetGuardrail, "healthy");
  assert.equal(data.checks.services.kyc, "operational");
  assert.equal(data.checks.services.faucet, "operational");
  assert.equal(data.checks.services.sep24Cashout, "operational");
  assert.equal(data.checks.services.keeper, "operational");
  assert.ok(data.uptimeSeconds >= 0);
});
