"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const stellar_sdk_1 = require("@stellar/stellar-sdk");
const custody_js_1 = require("./custody.js");
const wallet_store_js_1 = require("./wallet-store.js");
const sponsor_limiter_js_1 = require("./sponsor-limiter.js");
const node_os_1 = require("node:os");
const node_path_1 = __importDefault(require("node:path"));
const node_fs_1 = require("node:fs");
(0, node_test_1.default)("Custodial encryption - encrypts and decrypts secret key using AES-256-GCM", () => {
    const dummyKeyHex = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    const keyBuf = (0, custody_js_1.parseEncryptionKey)(dummyKeyHex);
    const sampleKeypair = stellar_sdk_1.Keypair.random();
    const plaintextSecret = sampleKeypair.secret();
    const encrypted = (0, custody_js_1.encryptSecret)(plaintextSecret, keyBuf);
    strict_1.default.ok(encrypted.ciphertext.length > 0);
    strict_1.default.ok(encrypted.iv.length === 24); // 12 bytes hex
    strict_1.default.ok(encrypted.tag.length === 32); // 16 bytes hex
    strict_1.default.notEqual(encrypted.ciphertext, plaintextSecret);
    const decrypted = (0, custody_js_1.decryptSecret)(encrypted, keyBuf);
    strict_1.default.equal(decrypted, plaintextSecret);
});
(0, node_test_1.default)("Custodial keypair generation - returns public key and encrypted payload without leaking secret", () => {
    const keyBuf = (0, custody_js_1.parseEncryptionKey)("0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef");
    const record = (0, custody_js_1.generateCustodialKeypair)("user_123", keyBuf);
    strict_1.default.equal(record.userId, "user_123");
    strict_1.default.ok(record.publicKey.startsWith("G"));
    strict_1.default.equal(record.publicKey.length, 56);
    strict_1.default.ok(record.encryptedSecret.ciphertext);
    // Ensure the object has no secret or raw property
    strict_1.default.equal(record.secret, undefined);
    strict_1.default.equal(record.secretKey, undefined);
});
(0, node_test_1.default)("CustodialWalletStore - generates, persists, and loads custodial wallets securely", () => {
    const tempFile = node_path_1.default.join((0, node_os_1.tmpdir)(), `soc-test-wallet-store-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
    const keyHex = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    try {
        const store1 = new wallet_store_js_1.CustodialWalletStore(tempFile, keyHex);
        const created = store1.getOrCreateWallet("user_alice");
        strict_1.default.equal(created.isNew, true);
        strict_1.default.ok(created.publicKey.startsWith("G"));
        // Querying again for user_alice should return the existing wallet
        const existing = store1.getOrCreateWallet("user_alice");
        strict_1.default.equal(existing.isNew, false);
        strict_1.default.equal(existing.publicKey, created.publicKey);
        // Lookups
        const byId = store1.getWalletByUserId("user_alice");
        strict_1.default.equal(byId?.publicKey, created.publicKey);
        const byPub = store1.getWalletByPublicKey(created.publicKey);
        strict_1.default.equal(byPub?.userId, "user_alice");
        // Decrypt in memory for transient signing
        const kp = store1.loadTransientKeypair("user_alice");
        strict_1.default.equal(kp.publicKey(), created.publicKey);
        // Initialize second store from same file (persistence test)
        const store2 = new wallet_store_js_1.CustodialWalletStore(tempFile, keyHex);
        const loaded = store2.getWalletByUserId("user_alice");
        strict_1.default.equal(loaded?.publicKey, created.publicKey);
    }
    finally {
        try {
            (0, node_fs_1.rmSync)(tempFile, { force: true });
        }
        catch {
            // Ignore
        }
    }
});
(0, node_test_1.default)("SponsorRateLimiter - enforces per-user spend, global budget, and frequency rate limits", () => {
    const tempFile = node_path_1.default.join((0, node_os_1.tmpdir)(), `soc-test-sponsor-limiter-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
    try {
        const limiter = new sponsor_limiter_js_1.SponsorRateLimiter(tempFile, {
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
        strict_1.default.throws(() => limiter.checkAllowance("user_bob", 100n), /Rate limit exceeded: Please wait before requesting another sponsored transaction/);
        // Another user shouldn't be blocked by user_bob's frequency limit
        limiter.checkAllowance("user_charlie", 400n);
        limiter.recordSpend("user_charlie", 400n);
        // Test per-user spend limit with clean file
        const tempFileUser = `${tempFile}-user.json`;
        const limiter2 = new sponsor_limiter_js_1.SponsorRateLimiter(tempFileUser, {
            maxSpendPerUserStroops: 500n,
            maxGlobalSpendStroops: 5000n,
            maxOperationsPerMinutePerUser: 10,
        });
        limiter2.checkAllowance("user_dave", 400n);
        limiter2.recordSpend("user_dave", 400n);
        strict_1.default.throws(() => limiter2.checkAllowance("user_dave", 200n), /User sponsorship limit reached/);
        try {
            (0, node_fs_1.rmSync)(tempFileUser, { force: true });
        }
        catch { }
        // Test global spend limit with clean file
        const tempFileGlobal = `${tempFile}-global.json`;
        const limiter3 = new sponsor_limiter_js_1.SponsorRateLimiter(tempFileGlobal, {
            maxSpendPerUserStroops: 10000n,
            maxGlobalSpendStroops: 1000n,
            maxOperationsPerMinutePerUser: 10,
        });
        limiter3.checkAllowance("user_eve", 900n);
        limiter3.recordSpend("user_eve", 900n);
        strict_1.default.throws(() => limiter3.checkAllowance("user_frank", 200n), /Sponsor budget temporarily reached/);
        try {
            (0, node_fs_1.rmSync)(tempFileGlobal, { force: true });
        }
        catch { }
    }
    finally {
        try {
            (0, node_fs_1.rmSync)(tempFile, { force: true });
        }
        catch {
            // Ignore
        }
    }
});
