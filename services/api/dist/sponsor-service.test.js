"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const wallet_store_js_1 = require("./wallet-store.js");
const sponsor_limiter_js_1 = require("./sponsor-limiter.js");
const sponsor_service_js_1 = require("./sponsor-service.js");
const node_os_1 = require("node:os");
const node_path_1 = __importDefault(require("node:path"));
const node_fs_1 = require("node:fs");
const stellar_sdk_1 = require("@stellar/stellar-sdk");
(0, node_test_1.default)("Custodial Sign & Sponsor safety controls - requires explicit user confirmation", async () => {
    const tempWallet = node_path_1.default.join((0, node_os_1.tmpdir)(), `test-w-${Date.now()}.json`);
    const tempLimiter = node_path_1.default.join((0, node_os_1.tmpdir)(), `test-l-${Date.now()}.json`);
    const keyHex = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    try {
        const walletStore = new wallet_store_js_1.CustodialWalletStore(tempWallet, keyHex);
        const limiter = new sponsor_limiter_js_1.SponsorRateLimiter(tempLimiter);
        const sponsorKp = stellar_sdk_1.Keypair.random();
        // Mock horizon server
        const mockHorizon = {
            loadAccount: async () => ({
                balances: [{ asset_type: "native", balance: "10.0" }],
            }),
            submitTransaction: async () => ({ hash: "tx_mock_hash" }),
        };
        const sponsorService = new sponsor_service_js_1.SponsorService({
            sponsorKeypair: sponsorKp,
            horizon: mockHorizon,
            walletStore,
            rateLimiter: limiter,
        });
        const user = walletStore.getOrCreateWallet("alice");
        // Attempting without explicit confirmation MUST reject
        await strict_1.default.rejects(async () => {
            await sponsorService.executeCustodialContribution({
                userId: "alice",
                userExplicitConfirmation: false,
                intent: "contribute",
            });
        }, /Explicit user confirmation is strictly required/);
    }
    finally {
        try {
            (0, node_fs_1.rmSync)(tempWallet, { force: true });
        }
        catch { }
        try {
            (0, node_fs_1.rmSync)(tempLimiter, { force: true });
        }
        catch { }
    }
});
(0, node_test_1.default)("Brand new user with zero XLM flow - onboarding creates wallet, provisions trustlines with sponsored reserve", async () => {
    const tempWallet = node_path_1.default.join((0, node_os_1.tmpdir)(), `test-w-zero-${Date.now()}.json`);
    const tempLimiter = node_path_1.default.join((0, node_os_1.tmpdir)(), `test-l-zero-${Date.now()}.json`);
    const keyHex = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    try {
        const walletStore = new wallet_store_js_1.CustodialWalletStore(tempWallet, keyHex);
        const limiter = new sponsor_limiter_js_1.SponsorRateLimiter(tempLimiter);
        const sponsorKp = stellar_sdk_1.Keypair.random();
        let createAccountCalled = false;
        let trustlineAuthorized = false;
        const mockKycService = {
            verify: async (req) => {
                // Assert zero XLM user account was provided
                strict_1.default.ok(req.account.startsWith("G"));
                strict_1.default.ok(req.testSecret); // secret used strictly in-process for initial trustline authorization
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
        };
        const sponsorService = new sponsor_service_js_1.SponsorService({
            sponsorKeypair: sponsorKp,
            horizon: {},
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
        strict_1.default.equal(onboardRes.userId, "newbie_zero_xlm");
        strict_1.default.ok(onboardRes.publicKey.startsWith("G"));
        strict_1.default.equal(onboardRes.verified, true);
        strict_1.default.equal(onboardRes.sponsoredAccountCreated, true);
        strict_1.default.equal(createAccountCalled, true);
        strict_1.default.equal(trustlineAuthorized, true);
        // Verify wallet was safely persisted
        const loaded = walletStore.getWalletByUserId("newbie_zero_xlm");
        strict_1.default.equal(loaded?.publicKey, onboardRes.publicKey);
    }
    finally {
        try {
            (0, node_fs_1.rmSync)(tempWallet, { force: true });
        }
        catch { }
        try {
            (0, node_fs_1.rmSync)(tempLimiter, { force: true });
        }
        catch { }
    }
});
