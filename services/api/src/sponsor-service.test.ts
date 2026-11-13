import test from "node:test";
import assert from "node:assert/strict";
import { CustodialWalletStore } from "./wallet-store.js";
import { SponsorRateLimiter } from "./sponsor-limiter.js";
import { SponsorService } from "./sponsor-service.js";
import { tmpdir } from "node:os";
import path from "node:path";
import { rmSync } from "node:fs";
import { Keypair } from "@stellar/stellar-sdk";

test("Custodial Sign & Sponsor safety controls - requires explicit user confirmation", async () => {
  const tempWallet = path.join(tmpdir(), `test-w-${Date.now()}.json`);
  const tempLimiter = path.join(tmpdir(), `test-l-${Date.now()}.json`);
  const keyHex = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

  try {
    const walletStore = new CustodialWalletStore(tempWallet, keyHex);
    const limiter = new SponsorRateLimiter(tempLimiter);
    const sponsorKp = Keypair.random();

    // Mock horizon server
    const mockHorizon = {
      loadAccount: async () => ({
        balances: [{ asset_type: "native", balance: "10.0" }],
      }),
      submitTransaction: async () => ({ hash: "tx_mock_hash" }),
    } as any;

    const sponsorService = new SponsorService({
      sponsorKeypair: sponsorKp,
      horizon: mockHorizon,
      walletStore,
      rateLimiter: limiter,
    });

    const user = walletStore.getOrCreateWallet("alice");

    // Attempting without explicit confirmation MUST reject
    await assert.rejects(
      async () => {
        await sponsorService.executeCustodialContribution({
          userId: "alice",
          userExplicitConfirmation: false,
          intent: "contribute",
        });
      },
      /Explicit user confirmation is strictly required/,
    );
  } finally {
    try { rmSync(tempWallet, { force: true }); } catch {}
    try { rmSync(tempLimiter, { force: true }); } catch {}
  }
});

test("Brand new user with zero XLM flow - onboarding creates wallet, provisions trustlines with sponsored reserve", async () => {
  const tempWallet = path.join(tmpdir(), `test-w-zero-${Date.now()}.json`);
  const tempLimiter = path.join(tmpdir(), `test-l-zero-${Date.now()}.json`);
  const keyHex = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

  try {
    const walletStore = new CustodialWalletStore(tempWallet, keyHex);
    const limiter = new SponsorRateLimiter(tempLimiter);
    const sponsorKp = Keypair.random();

    let createAccountCalled = false;
    let trustlineAuthorized = false;

    const mockKycService = {
      verify: async (req: any) => {
        // Assert zero XLM user account was provided
        assert.ok(req.account.startsWith("G"));
        assert.ok(req.testSecret); // secret used strictly in-process for initial trustline authorization
        createAccountCalled = true;
        trustlineAuthorized = true;
        return {
          verified: true,
          authorized: true,
          account: req.account,
          createdAccount: true,
          provisionedTrustline: true,
          transactionHash: "tx_kyc_sponsor_hash",
        };
      },
    } as any;

    const sponsorService = new SponsorService({
      sponsorKeypair: sponsorKp,
      horizon: {} as any,
      walletStore,
      rateLimiter: limiter,
      kycService: mockKycService,
    });

    const onboardRes = await sponsorService.onboardCustodialUser({
      userId: "newbie_zero_xlm",
      idNumber: "9001015000085",
      phone: "0820000000",
      otp: "123456",
      consent: true,
    });

    assert.equal(onboardRes.userId, "newbie_zero_xlm");
    assert.ok(onboardRes.publicKey.startsWith("G"));
    assert.equal(onboardRes.verified, true);
    assert.equal(onboardRes.sponsoredAccountCreated, true);
    assert.equal(createAccountCalled, true);
    assert.equal(trustlineAuthorized, true);

    // Verify wallet was safely persisted
    const loaded = walletStore.getWalletByUserId("newbie_zero_xlm");
    assert.equal(loaded?.publicKey, onboardRes.publicKey);
  } finally {
    try { rmSync(tempWallet, { force: true }); } catch {}
    try { rmSync(tempLimiter, { force: true }); } catch {}
  }
});
