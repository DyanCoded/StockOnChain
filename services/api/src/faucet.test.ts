import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  claimMzar,
  MZAR_FAUCET_COOLDOWN_MS,
  MzarRateLimiter,
  MzarTrustlineRequiredError,
} from "./faucet.js";

const destination = "GAXLZKWGKXFLKLSNYBL3CDXWJKHTPPDFUBX2I6ZRA4V5UBI2HJMFPSEH";

test("mZAR faucet enforces one claim per account for the full cooldown", async () => {
  const limiter = new MzarRateLimiter();
  let issueCount = 0;
  const issue = async () => {
    issueCount += 1;
    return "testnet-transaction";
  };
  const now = 1_000_000;

  const first = await claimMzar(destination, limiter, issue, now);
  const duplicate = await claimMzar(destination, limiter, issue, now + 1);
  const afterCooldown = await claimMzar(
    destination,
    limiter,
    issue,
    now + MZAR_FAUCET_COOLDOWN_MS,
  );

  assert.equal(first.status, 200);
  assert.equal(first.body.amount, "100");
  assert.equal(duplicate.status, 429);
  assert.equal(duplicate.retryAfterSeconds, 86_400);
  assert.equal(afterCooldown.status, 200);
  assert.equal(issueCount, 2);
});

test("concurrent faucet requests cannot bypass the account cooldown", async () => {
  const limiter = new MzarRateLimiter();
  let issueCount = 0;
  let releaseIssue: (() => void) | undefined;
  const pendingIssue = new Promise<string>((resolve) => {
    releaseIssue = () => resolve("testnet-transaction");
  });
  const issue = async () => {
    issueCount += 1;
    return pendingIssue;
  };

  const firstRequest = claimMzar(destination, limiter, issue, 2_000_000);
  const secondRequest = await claimMzar(destination, limiter, issue, 2_000_000);
  releaseIssue?.();
  const firstResult = await firstRequest;

  assert.equal(firstResult.status, 200);
  assert.equal(secondRequest.status, 429);
  assert.equal(issueCount, 1);
});

test("missing trustline does not consume the faucet allowance", async () => {
  const limiter = new MzarRateLimiter();
  const result = await claimMzar(
    destination,
    limiter,
    async () => {
      throw new MzarTrustlineRequiredError();
    },
    3_000_000,
  );
  const retry = await claimMzar(
    destination,
    limiter,
    async () => "testnet-transaction",
    3_000_001,
  );

  assert.equal(result.status, 409);
  assert.equal(retry.status, 200);
});

test("mZAR faucet cooldown survives limiter restarts without storing account keys", async () => {
  const directory = mkdtempSync(path.join(tmpdir(), "mzar-faucet-"));
  const statePath = path.join(directory, "rate-limits.json");
  try {
    const firstLimiter = new MzarRateLimiter(statePath);
    const first = await claimMzar(
      destination,
      firstLimiter,
      async () => "testnet-transaction",
      4_000_000,
    );
    const restartedLimiter = new MzarRateLimiter(statePath);
    const afterRestart = await claimMzar(
      destination,
      restartedLimiter,
      async () => "should-not-be-issued",
      4_000_001,
    );

    assert.equal(first.status, 200);
    assert.equal(afterRestart.status, 429);
    assert.doesNotMatch(
      readFileSync(statePath, "utf8"),
      new RegExp(destination),
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("separate API limiter instances share an atomic persistent cooldown", async () => {
  const directory = mkdtempSync(path.join(tmpdir(), "mzar-faucet-shared-"));
  const statePath = path.join(directory, "rate-limits.json");
  try {
    const firstLimiter = new MzarRateLimiter(statePath);
    const secondLimiter = new MzarRateLimiter(statePath);
    const first = await claimMzar(
      destination,
      firstLimiter,
      async () => "testnet-transaction",
      5_000_000,
    );
    const second = await claimMzar(
      destination,
      secondLimiter,
      async () => "should-not-be-issued",
      5_000_001,
    );

    assert.equal(first.status, 200);
    assert.equal(second.status, 429);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
