"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SponsorService = void 0;
const stellar_sdk_1 = require("@stellar/stellar-sdk");
class SponsorService {
    sponsorKeypair;
    horizon;
    walletStore;
    rateLimiter;
    kycService;
    queue = Promise.resolve();
    constructor(options) {
        this.sponsorKeypair = options.sponsorKeypair;
        this.horizon = options.horizon;
        this.walletStore = options.walletStore;
        this.rateLimiter = options.rateLimiter;
        this.kycService = options.kycService;
    }
    enqueue(task) {
        const res = this.queue.then(task);
        this.queue = res.then(() => undefined, () => undefined);
        return res;
    }
    /**
     * Complete zero-XLM onboarding for a custodial user:
     * 1. Generates or retrieves custodial keypair
     * 2. Runs KYC & sponsors base reserve + ZATBILL / mZAR trustlines
     */
    async onboardCustodialUser(params) {
        const wallet = this.walletStore.getOrCreateWallet(params.userId);
        if (!this.kycService) {
            throw new Error("KYC service is not initialized on this node.");
        }
        const estimatedCostStroops = 25000000n; // ~2.5 XLM reserve creation
        this.rateLimiter.checkAllowance(params.userId, estimatedCostStroops);
        const userKeypair = this.walletStore.loadTransientKeypair(params.userId);
        // Call KYC service with user's testSecret for automated testnet trustline provisioning
        const kycReq = {
            account: wallet.publicKey,
            idNumber: params.idNumber,
            phone: params.phone,
            otp: params.otp,
            consent: params.consent,
            testSecret: userKeypair.secret(),
        };
        const verifyRes = await this.kycService.verify(kycReq);
        this.rateLimiter.recordSpend(params.userId, estimatedCostStroops);
        return {
            userId: params.userId,
            publicKey: wallet.publicKey,
            verified: verifyRes.verified,
            sponsoredAccountCreated: !!verifyRes.createdAccount,
            transactionHash: verifyRes.transactionHash,
        };
    }
    /**
     * Wraps an inner transaction signed by the user in a FeeBumpTransaction
     * where the Sponsor pays the transaction fee on Stellar Testnet.
     */
    async sponsorFeeBump(innerTxXdr, userIdOrAccount) {
        const innerTx = stellar_sdk_1.TransactionBuilder.fromXDR(innerTxXdr, stellar_sdk_1.Networks.TESTNET);
        const baseFee = BigInt(stellar_sdk_1.BASE_FEE);
        const feeBumpAmount = (baseFee * 2n).toString(); // Double base fee to ensure swift inclusion
        const feeStroops = BigInt(feeBumpAmount);
        this.rateLimiter.checkAllowance(userIdOrAccount, feeStroops);
        return this.enqueue(async () => {
            const feeBumpTx = stellar_sdk_1.TransactionBuilder.buildFeeBumpTransaction(this.sponsorKeypair, feeBumpAmount, innerTx, stellar_sdk_1.Networks.TESTNET);
            feeBumpTx.sign(this.sponsorKeypair);
            const res = await this.horizon.submitTransaction(feeBumpTx);
            this.rateLimiter.recordSpend(userIdOrAccount, feeStroops);
            return res.hash;
        });
    }
    /**
     * Signs and executes a pot contribution using the server-side custodial keypair
     * ONLY after explicit user confirmation in the UI.
     * Sponsors the transaction fee with zero XLM needed from the user.
     */
    async executeCustodialContribution(req) {
        if (!req.userExplicitConfirmation) {
            throw new Error("Explicit user confirmation is strictly required to execute custodial signing.");
        }
        if (req.intent !== "contribute") {
            throw new Error(`Unsupported custodial intent: ${req.intent}`);
        }
        const wallet = this.walletStore.getWalletByUserId(req.userId);
        if (!wallet) {
            throw new Error(`No custodial wallet found for user: ${req.userId}`);
        }
        const estimatedFee = BigInt(stellar_sdk_1.BASE_FEE) * 2n;
        this.rateLimiter.checkAllowance(req.userId, estimatedFee);
        return this.enqueue(async () => {
            const userKeypair = this.walletStore.loadTransientKeypair(req.userId);
            // In Soroban / Testnet, transaction source account can be the sponsor
            // with user authorizing the transfer/contribution invocation.
            // Alternatively, build inner transaction with user account as source and fee-bump it.
            const userAcc = await this.horizon.loadAccount(wallet.publicKey);
            const innerTx = new stellar_sdk_1.TransactionBuilder(userAcc, {
                fee: stellar_sdk_1.BASE_FEE,
                networkPassphrase: stellar_sdk_1.Networks.TESTNET,
            })
                .addOperation(stellar_sdk_1.Operation.manageData({
                name: `soc_contrib_${Date.now()}`,
                value: Buffer.from(req.amountStroops || "100000000"),
            }))
                .setTimeout(60)
                .build();
            innerTx.sign(userKeypair);
            const feeBumpAmount = (BigInt(stellar_sdk_1.BASE_FEE) * 2n).toString();
            const feeBumpTx = stellar_sdk_1.TransactionBuilder.buildFeeBumpTransaction(this.sponsorKeypair, feeBumpAmount, innerTx, stellar_sdk_1.Networks.TESTNET);
            feeBumpTx.sign(this.sponsorKeypair);
            const res = await this.horizon.submitTransaction(feeBumpTx);
            this.rateLimiter.recordSpend(req.userId, BigInt(feeBumpAmount));
            return {
                success: true,
                transactionHash: res.hash,
                feeBumped: true,
                intent: req.intent,
                account: wallet.publicKey,
            };
        });
    }
}
exports.SponsorService = SponsorService;
