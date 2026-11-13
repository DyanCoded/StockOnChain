import test from "node:test";
import assert from "node:assert/strict";
import { Keypair } from "@stellar/stellar-sdk";
import {
  encryptSecret,
  decryptSecret,
  generateCustodialKeypair,
  parseEncryptionKey,
} from "./custody.js";
import { CustodialWalletStore } from "./wallet-store.js";
import { SponsorRateLimiter } from "./sponsor-limiter.js";
import { tmpdir } from "node:os";
import path from "node:path";
import { rmSync } from "node:fs";

test("Custodial encryption - encrypts and decrypts secret key using AES-256-GCM", () => {
  const dummyKeyHex = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  const keyBuf = parseEncryptionKey(dummyKeyHex);

  const sampleKeypair = Keypair.random();
  const plaintextSecret = sampleKeypair.secret();

  const encrypted = encryptSecret(plaintextSecret, keyBuf);
  assert.ok(encrypted.ciphertext.length > 0);
  assert.ok(encrypted.iv.length === 24); // 12 bytes hex
  assert.ok(encrypted.tag.length === 32); // 16 bytes hex
  assert.notEqual(encrypted.ciphertext, plaintextSecret);

  const decrypted = decryptSecret(encrypted, keyBuf);
  assert.equal(decrypted, plaintextSecret);
});

test("Custodial keypair generation - returns public key and encrypted payload without leaking secret", () => {
  const keyBuf = parseEncryptionKey("0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef");
  const record = generateCustodialKeypair("user_123", keyBuf);

  assert.equal(record.userId, "user_123");
  assert.ok(record.publicKey.startsWith("G"));
  assert.equal(record.publicKey.length, 56);
  assert.ok(record.encryptedSecret.ciphertext);
  // Ensure the object has no secret or raw property
  assert.equal((record as unknown as Record<string, unknown>).secret, undefined);
  assert.equal((record as unknown as Record<string, unknown>).secretKey, undefined);
});

test("CustodialWalletStore - generates, persists, and loads custodial wallets securely", () => {
  const tempFile = path.join(
    tmpdir(),
    `soc-test-wallet-store-${Date.now()}-${Math.random().toString(36).slice(2)}.json`,
  );
  const keyHex = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

  try {
    const store1 = new CustodialWalletStore(tempFile, keyHex);
    const created = store1.getOrCreateWallet("user_alice");
    assert.equal(created.isNew, true);
    assert.ok(created.publicKey.startsWith("G"));

    // Querying again for user_alice should return the existing wallet
    const existing = store1.getOrCreateWallet("user_alice");
    assert.equal(existing.isNew, false);
    assert.equal(existing.publicKey, created.publicKey);

    // Lookups
    const byId = store1.getWalletByUserId("user_alice");
    assert.equal(byId?.publicKey, created.publicKey);

    const byPub = store1.getWalletByPublicKey(created.publicKey);
    assert.equal(byPub?.userId, "user_alice");

    // Decrypt in memory for transient signing
    const kp = store1.loadTransientKeypair("user_alice");
    assert.equal(kp.publicKey(), created.publicKey);

    // Initialize second store from same file (persistence test)
    const store2 = new CustodialWalletStore(tempFile, keyHex);
    const loaded = store2.getWalletByUserId("user_alice");
    assert.equal(loaded?.publicKey, created.publicKey);
  } finally {
    try {
      rmSync(tempFile, { force: true });
    } catch {
      // Ignore
    }
  }
});

test("SponsorRateLimiter - enforces per-user spend, global budget, and frequency rate limits", () => {
  const tempFile = path.join(
    tmpdir(),
    `soc-test-sponsor-limiter-${Date.now()}-${Math.random().toString(36).slice(2)}.json`,
  );

  try {
    const limiter = new SponsorRateLimiter(tempFile, {
      maxSpendPerUserStroops: 1000n,
      maxGlobalSpendStroops: 2500n,
      maxOperationsPerMinutePerUser: 2,
      windowMs: 60_000,
    });

    // 1st request should pass
    limiter.checkAllowance("user_bob", 400n);
    limiter.recordSpend("user_bob", 400n);

    // 2nd request should pass
    limiter.checkAllowance("user_bob", 400n);
    limiter.recordSpend("user_bob", 400n);

    // 3rd request in same minute should fail frequency rate limit
    assert.throws(
      () => limiter.checkAllowance("user_bob", 100n),
      /Rate limit exceeded: Please wait before requesting another sponsored transaction/,
    );

    // Another user shouldn't be blocked by user_bob's frequency limit
    limiter.checkAllowance("user_charlie", 400n);
    limiter.recordSpend("user_charlie", 400n);

    // Test per-user spend limit with clean file
    const tempFileUser = `${tempFile}-user.json`;
    const limiter2 = new SponsorRateLimiter(tempFileUser, {
      maxSpendPerUserStroops: 500n,
      maxGlobalSpendStroops: 5000n,
      maxOperationsPerMinutePerUser: 10,
    });
    limiter2.checkAllowance("user_dave", 400n);
    limiter2.recordSpend("user_dave", 400n);
    assert.throws(
      () => limiter2.checkAllowance("user_dave", 200n),
      /User sponsorship limit reached/,
    );
    try { rmSync(tempFileUser, { force: true }); } catch {}

    // Test global spend limit with clean file
    const tempFileGlobal = `${tempFile}-global.json`;
    const limiter3 = new SponsorRateLimiter(tempFileGlobal, {
      maxSpendPerUserStroops: 10000n,
      maxGlobalSpendStroops: 1000n,
      maxOperationsPerMinutePerUser: 10,
    });
    limiter3.checkAllowance("user_eve", 900n);
    limiter3.recordSpend("user_eve", 900n);
    assert.throws(
      () => limiter3.checkAllowance("user_frank", 200n),
      /Sponsor budget temporarily reached/,
    );
    try { rmSync(tempFileGlobal, { force: true }); } catch {}
  } finally {
    try {
      rmSync(tempFile, { force: true });
    } catch {
      // Ignore
    }
  }
});
