"use strict";
/**
 * @stockonchain/api
 * Backend service for verification, transaction fee sponsorship (Sponsor role), and simulation.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.server = void 0;
exports.getNetworkConfig = getNetworkConfig;
const node_http_1 = require("node:http");
const node_path_1 = __importDefault(require("node:path"));
const stellar_sdk_1 = require("@stellar/stellar-sdk");
const dotenv_1 = require("dotenv");
const chain_1 = require("@stockonchain/chain");
const faucet_js_1 = require("./faucet.js");
const kyc_js_1 = require("./kyc.js");
const wallet_store_js_1 = require("./wallet-store.js");
const sponsor_limiter_js_1 = require("./sponsor-limiter.js");
const sponsor_service_js_1 = require("./sponsor-service.js");
const sep24_js_1 = require("./sep24.js");
(0, dotenv_1.config)({ quiet: true });
(0, chain_1.assertTestnetConfiguration)();
const anchorSecret = process.env.STELLAR_ANCHOR_SIM_SECRET_KEY?.trim();
const expectedAnchor = process.env.STELLAR_ANCHOR_SIM_PUBLIC_KEY?.trim();
if (!anchorSecret || !expectedAnchor) {
    throw new Error("STELLAR_ANCHOR_SIM_SECRET_KEY and STELLAR_ANCHOR_SIM_PUBLIC_KEY are required for the Testnet mZAR faucet.");
}
let anchorKeypair;
try {
    anchorKeypair = stellar_sdk_1.Keypair.fromSecret(anchorSecret);
}
catch {
    throw new Error("STELLAR_ANCHOR_SIM_SECRET_KEY is invalid; no key values are printed.");
}
if (anchorKeypair.publicKey() !== expectedAnchor) {
    throw new Error("STELLAR_ANCHOR_SIM_PUBLIC_KEY does not match its secret key; no key values are printed.");
}
function getNetworkConfig() {
    (0, chain_1.assertTestnetConfiguration)();
    return chain_1.STELLAR_NETWORKS.testnet;
}
const horizon = new stellar_sdk_1.Horizon.Server(chain_1.STELLAR_NETWORKS.testnet.horizonUrl);
const mzar = new stellar_sdk_1.Asset("mZAR", anchorKeypair.publicKey());
const rateLimiter = new faucet_js_1.MzarRateLimiter(process.env.MZAR_FAUCET_STATE_PATH?.trim() ||
    node_path_1.default.join(process.cwd(), ".local", "mzar-faucet-rate-limits.json"));
let mzarSubmissionQueue = Promise.resolve();
let sep24Simulator = null;
try {
    sep24Simulator = new sep24_js_1.Sep24Simulator({
        serverKeypair: anchorKeypair,
        homeDomain: process.env.STELLAR_HOME_DOMAIN?.trim() || "stockonchain.test",
    });
}
catch (error) {
    console.error("Warning: Could not initialize SEP-24 simulator.", error instanceof Error ? error.message : "Unknown error");
}
const zatbillIssuerSecret = process.env.STELLAR_ZATBILL_ISSUER_SECRET_KEY?.trim();
const sponsorSecret = process.env.STELLAR_SPONSOR_SECRET_KEY?.trim();
const dealerSecret = process.env.STELLAR_DEALER_SECRET_KEY?.trim();
let kycService = null;
let sponsorService = null;
let walletStore = null;
let sponsorRateLimiter = null;
if (zatbillIssuerSecret && sponsorSecret && dealerSecret) {
    try {
        const zatbillIssuer = stellar_sdk_1.Keypair.fromSecret(zatbillIssuerSecret);
        const sponsor = stellar_sdk_1.Keypair.fromSecret(sponsorSecret);
        const dealer = stellar_sdk_1.Keypair.fromSecret(dealerSecret);
        const zatbillAsset = new stellar_sdk_1.Asset("ZATBILL", zatbillIssuer.publicKey());
        const kycStore = new kyc_js_1.KycStore(process.env.KYC_STATE_PATH?.trim() ||
            node_path_1.default.join(process.cwd(), ".local", "kyc-state.json"));
        kycService = new kyc_js_1.KycService({
            issuerKeypair: zatbillIssuer,
            sponsorKeypair: sponsor,
            dealerKeypair: dealer,
            horizon,
            zatbillAsset,
            kycStore,
        });
        const encryptionKey = process.env.WALLET_ENCRYPTION_KEY?.trim() ||
            "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
        walletStore = new wallet_store_js_1.CustodialWalletStore(process.env.WALLET_STORE_PATH?.trim(), encryptionKey);
        sponsorRateLimiter = new sponsor_limiter_js_1.SponsorRateLimiter(process.env.SPONSOR_LIMIT_STATE_PATH?.trim());
        sponsorService = new sponsor_service_js_1.SponsorService({
            sponsorKeypair: sponsor,
            horizon,
            walletStore,
            rateLimiter: sponsorRateLimiter,
            kycService,
        });
    }
    catch (error) {
        console.error("Warning: Could not initialize KYC / Sponsor service due to invalid role keypair.", error instanceof Error ? error.message : "Unknown error");
    }
}
function statusCode(error) {
    if (typeof error !== "object" || error === null || !("response" in error)) {
        return undefined;
    }
    const response = error.response;
    if (typeof response !== "object" ||
        response === null ||
        !("status" in response)) {
        return undefined;
    }
    return typeof response.status === "number" ? response.status : undefined;
}
function isValidDestination(value) {
    return (0, kyc_js_1.isValidStellarPublicKey)(value);
}
async function issueMzar(destination) {
    const recipient = await horizon
        .loadAccount(destination)
        .catch((error) => {
        if (statusCode(error) === 404) {
            throw new faucet_js_1.MzarTrustlineRequiredError();
        }
        throw error;
    });
    const hasTrustline = recipient.balances.some((balance) => "asset_code" in balance &&
        balance.asset_code === mzar.code &&
        balance.asset_issuer === mzar.issuer);
    if (!hasTrustline) {
        throw new faucet_js_1.MzarTrustlineRequiredError();
    }
    const submit = async () => {
        const source = await horizon.loadAccount(anchorKeypair.publicKey());
        const transaction = new stellar_sdk_1.TransactionBuilder(source, {
            fee: stellar_sdk_1.BASE_FEE,
            networkPassphrase: stellar_sdk_1.Networks.TESTNET,
        })
            .addOperation(stellar_sdk_1.Operation.payment({
            destination,
            asset: mzar,
            amount: faucet_js_1.MZAR_FAUCET_AMOUNT,
        }))
            .setTimeout(60)
            .build();
        transaction.sign(anchorKeypair);
        const result = await horizon.submitTransaction(transaction);
        return result.hash;
    };
    const result = mzarSubmissionQueue.then(submit);
    mzarSubmissionQueue = result.then(() => undefined, () => undefined);
    return result;
}
async function readJsonBody(request) {
    const chunks = [];
    let length = 0;
    for await (const chunk of request) {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        length += buffer.length;
        if (length > 16384) {
            throw new Error("Request body exceeds 16KB.");
        }
        chunks.push(buffer);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
function sendJson(response, status, body, retryAfterSeconds) {
    response.writeHead(status, {
        "Cache-Control": "no-store",
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        ...(retryAfterSeconds === undefined
            ? {}
            : { "Retry-After": String(retryAfterSeconds) }),
    });
    response.end(JSON.stringify(body));
}
exports.server = (0, node_http_1.createServer)(async (request, response) => {
    const reqUrl = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
    const pathname = reqUrl.pathname;
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
        response.writeHead(204, {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Access-Control-Max-Age": "86400",
        });
        response.end();
        return;
    }
    // Route: GET /kyc/status?account=G...
    if (pathname === "/kyc/status" && request.method === "GET") {
        if (!kycService) {
            sendJson(response, 503, { error: "KYC service is not configured on this node." });
            return;
        }
        const account = reqUrl.searchParams.get("account");
        if (!(0, kyc_js_1.isValidStellarPublicKey)(account)) {
            sendJson(response, 400, { error: "account query parameter must be a valid Stellar public key." });
            return;
        }
        try {
            const status = await kycService.getStatus(account);
            sendJson(response, 200, status);
        }
        catch (error) {
            console.error("KYC status check failed:", error instanceof Error ? error.message : "Unknown error");
            sendJson(response, 500, { error: "Could not retrieve KYC status." });
        }
        return;
    }
    // Route: POST /kyc/verify
    if (pathname === "/kyc/verify") {
        if (request.method !== "POST") {
            response.setHeader("Allow", "POST");
            sendJson(response, 405, { error: "Use POST to submit verification." });
            return;
        }
        if (!kycService) {
            sendJson(response, 503, { error: "KYC service is not configured on this node." });
            return;
        }
        let body;
        try {
            body = await readJsonBody(request);
        }
        catch {
            sendJson(response, 400, { error: "Send a valid JSON request." });
            return;
        }
        const payload = body;
        try {
            const result = await kycService.verify(payload);
            sendJson(response, 200, {
                success: true,
                verified: result.verified,
                authorized: result.authorized,
                account: result.account,
                createdAccount: result.createdAccount,
                provisionedTrustline: result.provisionedTrustline,
                transactionHash: result.transactionHash,
            });
        }
        catch (error) {
            // Never log sensitive payload fields (G1 & G7)
            const sanitized = (0, kyc_js_1.sanitizeLogPayload)(payload);
            console.error("KYC verification error:", error instanceof Error ? error.message : "Unknown error", sanitized);
            sendJson(response, 400, {
                success: false,
                error: error instanceof Error ? error.message : "Verification failed.",
            });
        }
        return;
    }
    // Route: POST /kyc/revoke (Admin action)
    if (pathname === "/kyc/revoke") {
        if (request.method !== "POST") {
            response.setHeader("Allow", "POST");
            sendJson(response, 405, { error: "Use POST to revoke verification." });
            return;
        }
        if (!kycService) {
            sendJson(response, 503, { error: "KYC service is not configured on this node." });
            return;
        }
        let body;
        try {
            body = await readJsonBody(request);
        }
        catch {
            sendJson(response, 400, { error: "Send a valid JSON request." });
            return;
        }
        const payload = body;
        if (!(0, kyc_js_1.isValidStellarPublicKey)(payload.account)) {
            sendJson(response, 400, { error: "account must be a valid Stellar public key." });
            return;
        }
        try {
            const result = await kycService.revoke(payload.account);
            sendJson(response, 200, {
                success: true,
                verified: result.verified,
                authorized: result.authorized,
                account: result.account,
                transactionHash: result.transactionHash,
            });
        }
        catch (error) {
            console.error("KYC revocation error:", error instanceof Error ? error.message : "Unknown error");
            sendJson(response, 500, {
                success: false,
                error: error instanceof Error ? error.message : "Revocation failed.",
            });
        }
        return;
    }
    // Route: POST /zatbill/claim (Test payment to demonstrate verified vs unverified)
    if (pathname === "/zatbill/claim") {
        if (request.method !== "POST") {
            response.setHeader("Allow", "POST");
            sendJson(response, 405, { error: "Use POST to claim ZATBILL." });
            return;
        }
        if (!kycService) {
            sendJson(response, 503, { error: "KYC service is not configured on this node." });
            return;
        }
        let body;
        try {
            body = await readJsonBody(request);
        }
        catch {
            sendJson(response, 400, { error: "Send a valid JSON request." });
            return;
        }
        const payload = body;
        if (!(0, kyc_js_1.isValidStellarPublicKey)(payload.destination)) {
            sendJson(response, 400, { error: "destination must be a valid Stellar public key." });
            return;
        }
        const result = await kycService.transferDemoZatbill(payload.destination, payload.amount || "1");
        if (!result.success) {
            sendJson(response, 403, {
                success: false,
                error: result.error || "Payment rejected.",
                reason: result.reason,
                code: result.code,
            });
            return;
        }
        sendJson(response, 200, {
            success: true,
            account: result.account,
            amount: result.amount,
            transactionHash: result.transactionHash,
        });
        return;
    }
    // Route: POST /faucet/mzar
    if (pathname === "/faucet/mzar") {
        if (request.method !== "POST") {
            response.setHeader("Allow", "POST");
            sendJson(response, 405, { error: "Use POST to request mZAR." });
            return;
        }
        let body;
        try {
            body = await readJsonBody(request);
        }
        catch {
            sendJson(response, 400, {
                error: "Send a valid JSON request.",
            });
            return;
        }
        const destination = typeof body === "object" && body !== null && "destination" in body
            ? body.destination
            : undefined;
        if (!isValidDestination(destination)) {
            sendJson(response, 400, {
                error: "destination must be a valid Stellar account public key.",
            });
            return;
        }
        try {
            const result = await (0, faucet_js_1.claimMzar)(destination, rateLimiter, issueMzar, Date.now());
            sendJson(response, result.status, result.body, result.retryAfterSeconds);
        }
        catch (error) {
            if (error instanceof faucet_js_1.MzarRateLimitStoreError) {
                sendJson(response, 503, {
                    error: "Faucet rate-limit storage is temporarily unavailable; no payment was submitted.",
                }, 1);
                return;
            }
            console.error("mZAR faucet payment failed; the account cooldown remains in effect.", error instanceof Error ? error.message : "Unknown payment error.");
            sendJson(response, 502, {
                error: `Could not complete the Testnet mZAR payment. The account remains rate-limited for ${faucet_js_1.MZAR_FAUCET_COOLDOWN_MS / 1000} seconds.`,
            });
        }
        return;
    }
    // Route: POST /wallet/create (custodial-lite keypair generation)
    if (pathname === "/wallet/create" && request.method === "POST") {
        if (!walletStore) {
            sendJson(response, 503, { error: "Wallet custody service is not configured on this node." });
            return;
        }
        let body;
        try {
            body = await readJsonBody(request);
        }
        catch {
            sendJson(response, 400, { error: "Send a valid JSON request." });
            return;
        }
        const userId = typeof body === "object" && body !== null && "userId" in body
            ? String(body.userId).trim()
            : "";
        if (!userId) {
            sendJson(response, 400, { error: "userId is required to create or load a custodial wallet." });
            return;
        }
        try {
            const wallet = walletStore.getOrCreateWallet(userId);
            sendJson(response, 200, {
                userId,
                publicKey: wallet.publicKey,
                isNew: wallet.isNew,
                createdAt: wallet.createdAt,
                custodyType: "custodial-lite",
                network: "testnet",
                disclaimer: "Prototype only. Private keys are encrypted server-side with WALLET_ENCRYPTION_KEY. Not for Mainnet or real funds.",
            });
        }
        catch (error) {
            sendJson(response, 500, {
                error: error instanceof Error ? error.message : "Failed to create custodial wallet.",
            });
        }
        return;
    }
    // Route: POST /wallet/sponsor/fee-bump
    if (pathname === "/wallet/sponsor/fee-bump" && request.method === "POST") {
        if (!sponsorService) {
            sendJson(response, 503, { error: "Sponsor service is not configured on this node." });
            return;
        }
        let body;
        try {
            body = await readJsonBody(request);
        }
        catch {
            sendJson(response, 400, { error: "Send a valid JSON request." });
            return;
        }
        const xdr = typeof body === "object" && body !== null && "innerTxXdr" in body
            ? String(body.innerTxXdr).trim()
            : "";
        const userIdOrAccount = typeof body === "object" && body !== null && "userId" in body
            ? String(body.userId).trim()
            : (typeof body === "object" && body !== null && "account" in body
                ? String(body.account).trim()
                : "");
        if (!xdr || !userIdOrAccount) {
            sendJson(response, 400, { error: "innerTxXdr and userId or account are required." });
            return;
        }
        try {
            const txHash = await sponsorService.sponsorFeeBump(xdr, userIdOrAccount);
            sendJson(response, 200, {
                success: true,
                transactionHash: txHash,
                feeBumped: true,
            });
        }
        catch (error) {
            sendJson(response, 400, {
                error: error instanceof Error ? error.message : "Failed to sponsor fee-bump transaction.",
            });
        }
        return;
    }
    // Route: POST /wallet/contribute (custodial explicit confirmation + sponsor)
    if (pathname === "/wallet/contribute" && request.method === "POST") {
        if (!sponsorService) {
            sendJson(response, 503, { error: "Sponsor service is not configured on this node." });
            return;
        }
        let body;
        try {
            body = await readJsonBody(request);
        }
        catch {
            sendJson(response, 400, { error: "Send a valid JSON request." });
            return;
        }
        const typedBody = body;
        if (!typedBody.userId) {
            sendJson(response, 400, { error: "userId is required." });
            return;
        }
        if (!typedBody.userExplicitConfirmation) {
            sendJson(response, 400, {
                error: "userExplicitConfirmation: true is required. Custodial key signing requires explicit user consent in the application UI.",
            });
            return;
        }
        try {
            const result = await sponsorService.executeCustodialContribution({
                userId: typedBody.userId,
                userExplicitConfirmation: true,
                intent: "contribute",
                amountStroops: typedBody.amountStroops,
                contractId: typedBody.contractId,
            });
            sendJson(response, 200, result);
        }
        catch (error) {
            sendJson(response, 400, {
                error: error instanceof Error ? error.message : "Failed to execute contribution.",
            });
        }
        return;
    }
    // Route: GET /wallet/sponsor/limits
    if (pathname === "/wallet/sponsor/limits" && request.method === "GET") {
        if (!sponsorRateLimiter) {
            sendJson(response, 503, { error: "Sponsor limiter not configured." });
            return;
        }
        const user = reqUrl.searchParams.get("userId") || reqUrl.searchParams.get("account") || undefined;
        const stats = sponsorRateLimiter.getStats(user);
        sendJson(response, 200, stats);
        return;
    }
    // ==========================================
    // SEP-10 & SEP-24 Anchor Routes
    // ==========================================
    // Route: GET /auth (SEP-10 challenge generation)
    if (pathname === "/auth" && request.method === "GET") {
        if (!sep24Simulator) {
            sendJson(response, 503, { error: "SEP-10 auth service not available." });
            return;
        }
        const account = reqUrl.searchParams.get("account");
        if (!(0, kyc_js_1.isValidStellarPublicKey)(account)) {
            sendJson(response, 400, { error: "account query parameter must be a valid Stellar public key." });
            return;
        }
        const challenge = sep24Simulator.buildChallengeTransaction(account);
        sendJson(response, 200, challenge);
        return;
    }
    // Route: POST /auth (SEP-10 challenge validation & token issuance)
    if (pathname === "/auth" && request.method === "POST") {
        if (!sep24Simulator) {
            sendJson(response, 503, { error: "SEP-10 auth service not available." });
            return;
        }
        let body;
        try {
            body = await readJsonBody(request);
        }
        catch {
            sendJson(response, 400, { error: "Send a valid JSON request." });
            return;
        }
        const tx = typeof body === "object" && body !== null && "transaction" in body
            ? String(body.transaction).trim()
            : "";
        const account = typeof body === "object" && body !== null && "account" in body
            ? String(body.account).trim()
            : "";
        if (!tx || !(0, kyc_js_1.isValidStellarPublicKey)(account)) {
            sendJson(response, 400, { error: "transaction (XDR) and account are required." });
            return;
        }
        try {
            const token = sep24Simulator.verifyChallenge(tx, account);
            sendJson(response, 200, { token });
        }
        catch (error) {
            sendJson(response, 400, {
                error: error instanceof Error ? error.message : "SEP-10 authentication failed.",
            });
        }
        return;
    }
    // Route: GET /sep24/info (SEP-24 info endpoint)
    if (pathname === "/sep24/info" && request.method === "GET") {
        if (!sep24Simulator) {
            sendJson(response, 503, { error: "SEP-24 service not available." });
            return;
        }
        const info = sep24Simulator.getInfo();
        sendJson(response, 200, info);
        return;
    }
    // Route: POST /sep24/transactions/withdraw/interactive
    if (pathname === "/sep24/transactions/withdraw/interactive" && request.method === "POST") {
        if (!sep24Simulator) {
            sendJson(response, 503, { error: "SEP-24 service not available." });
            return;
        }
        let body;
        try {
            body = await readJsonBody(request);
        }
        catch {
            sendJson(response, 400, { error: "Send a valid JSON request." });
            return;
        }
        const typedBody = body;
        if (!(0, kyc_js_1.isValidStellarPublicKey)(typedBody.account)) {
            sendJson(response, 400, { error: "account must be a valid Stellar public key." });
            return;
        }
        try {
            const res = sep24Simulator.initiateWithdrawal({
                account: typedBody.account,
                amount: typedBody.amount || "100",
                asset_code: typedBody.asset_code || "mZAR",
                rail: typedBody.rail,
                recipient: typedBody.recipient,
            });
            sendJson(response, 200, res);
        }
        catch (error) {
            sendJson(response, 400, {
                error: error instanceof Error ? error.message : "Failed to initiate withdrawal.",
            });
        }
        return;
    }
    // Route: POST /sep24/transactions/deposit/interactive
    if (pathname === "/sep24/transactions/deposit/interactive" && request.method === "POST") {
        if (!sep24Simulator) {
            sendJson(response, 503, { error: "SEP-24 service not available." });
            return;
        }
        let body;
        try {
            body = await readJsonBody(request);
        }
        catch {
            sendJson(response, 400, { error: "Send a valid JSON request." });
            return;
        }
        const typedBody = body;
        if (!(0, kyc_js_1.isValidStellarPublicKey)(typedBody.account)) {
            sendJson(response, 400, { error: "account must be a valid Stellar public key." });
            return;
        }
        try {
            const res = sep24Simulator.initiateDeposit({
                account: typedBody.account,
                amount: typedBody.amount || "100",
                asset_code: typedBody.asset_code || "mZAR",
            });
            sendJson(response, 200, res);
        }
        catch (error) {
            sendJson(response, 400, {
                error: error instanceof Error ? error.message : "Failed to initiate deposit.",
            });
        }
        return;
    }
    // Route: GET /sep24/transaction (SEP-24 single transaction lookup)
    if (pathname === "/sep24/transaction" && request.method === "GET") {
        if (!sep24Simulator) {
            sendJson(response, 503, { error: "SEP-24 service not available." });
            return;
        }
        const id = reqUrl.searchParams.get("id");
        if (!id) {
            sendJson(response, 400, { error: "id query parameter is required." });
            return;
        }
        const tx = sep24Simulator.getTransaction(id);
        if (!tx) {
            sendJson(response, 404, { error: "Transaction not found." });
            return;
        }
        sendJson(response, 200, { transaction: tx });
        return;
    }
    // Route: POST /sep24/payout/execute (executes simulated local bank or mobile money payout)
    if (pathname === "/sep24/payout/execute" && request.method === "POST") {
        if (!sep24Simulator) {
            sendJson(response, 503, { error: "SEP-24 service not available." });
            return;
        }
        let body;
        try {
            body = await readJsonBody(request);
        }
        catch {
            sendJson(response, 400, { error: "Send a valid JSON request." });
            return;
        }
        const txId = typeof body === "object" && body !== null && "transaction_id" in body
            ? String(body.transaction_id).trim()
            : "";
        const stellarTx = typeof body === "object" && body !== null && "stellar_transaction_id" in body
            ? String(body.stellar_transaction_id).trim()
            : `sim_tx_${Date.now()}`;
        if (!txId) {
            sendJson(response, 400, { error: "transaction_id is required." });
            return;
        }
        try {
            const completed = sep24Simulator.executeSimulatedPayout(txId, stellarTx);
            sendJson(response, 200, {
                success: true,
                transaction: completed,
                simulated: true,
                disclaimer: "SIMULATION ONLY: Simulated local payout completed. No actual fiat or real-world money moved.",
            });
        }
        catch (error) {
            sendJson(response, 400, {
                error: error instanceof Error ? error.message : "Payout execution failed.",
            });
        }
        return;
    }
    // Route: GET /sep24/quote
    if (pathname === "/sep24/quote" && request.method === "GET") {
        if (!sep24Simulator) {
            sendJson(response, 503, { error: "SEP-24 service not available." });
            return;
        }
        const rail = reqUrl.searchParams.get("rail") || "instant_bank";
        const amount = parseFloat(reqUrl.searchParams.get("amount") || "100");
        const quote = sep24Simulator.quotePayout({
            rail,
            recipient: "Simulated User",
            amountMzar: isNaN(amount) ? 100 : amount,
        });
        sendJson(response, 200, quote);
        return;
    }
    sendJson(response, 404, { error: "Not found." });
});
const port = Number(process.env.PORT ?? 3001);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer from 1 through 65535.");
}
// Start listening if run directly
if (process.env.NODE_ENV !== "test") {
    exports.server.listen(port, () => {
        console.log(`StockOnChain Testnet API listening on port ${port}.`);
    });
}
