/**
 * @stockonchain/api
 * Backend service for verification, transaction fee sponsorship (Sponsor role), and simulation.
 */

import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import path from "node:path";
import {
  Asset,
  BASE_FEE,
  Horizon,
  Keypair,
  Networks,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import { config } from "dotenv";
import {
  assertTestnetConfiguration,
  STELLAR_NETWORKS,
} from "@stockonchain/chain";
import {
  claimMzar,
  MZAR_FAUCET_COOLDOWN_MS,
  MZAR_FAUCET_AMOUNT,
  MzarRateLimitStoreError,
  MzarRateLimiter,
  MzarTrustlineRequiredError,
} from "./faucet.js";
import {
  isValidStellarPublicKey,
  KycService,
  KycStore,
  sanitizeLogPayload,
  type VerifyRequest,
} from "./kyc.js";
import { CustodialWalletStore } from "./wallet-store.js";
import { SponsorRateLimiter } from "./sponsor-limiter.js";
import { SponsorService } from "./sponsor-service.js";
import { Sep24Simulator } from "./sep24.js";

config({ quiet: true });
assertTestnetConfiguration();

const anchorSecret = process.env.STELLAR_ANCHOR_SIM_SECRET_KEY?.trim();
const expectedAnchor = process.env.STELLAR_ANCHOR_SIM_PUBLIC_KEY?.trim();
if (!anchorSecret || !expectedAnchor) {
  throw new Error(
    "STELLAR_ANCHOR_SIM_SECRET_KEY and STELLAR_ANCHOR_SIM_PUBLIC_KEY are required for the Testnet mZAR faucet.",
  );
}

let anchorKeypair: Keypair;
try {
  anchorKeypair = Keypair.fromSecret(anchorSecret);
} catch {
  throw new Error(
    "STELLAR_ANCHOR_SIM_SECRET_KEY is invalid; no key values are printed.",
  );
}
if (anchorKeypair.publicKey() !== expectedAnchor) {
  throw new Error(
    "STELLAR_ANCHOR_SIM_PUBLIC_KEY does not match its secret key; no key values are printed.",
  );
}

export function getNetworkConfig() {
  assertTestnetConfiguration();
  return STELLAR_NETWORKS.testnet;
}

const horizon = new Horizon.Server(STELLAR_NETWORKS.testnet.horizonUrl);
const mzar = new Asset("mZAR", anchorKeypair.publicKey());
const rateLimiter = new MzarRateLimiter(
  process.env.MZAR_FAUCET_STATE_PATH?.trim() ||
    path.join(process.cwd(), ".local", "mzar-faucet-rate-limits.json"),
);
let mzarSubmissionQueue = Promise.resolve();

let sep24Simulator: Sep24Simulator | null = null;
try {
  sep24Simulator = new Sep24Simulator({
    serverKeypair: anchorKeypair,
    homeDomain: process.env.STELLAR_HOME_DOMAIN?.trim() || "stockonchain.test",
  });
} catch (error) {
  console.error(
    "Warning: Could not initialize SEP-24 simulator.",
    error instanceof Error ? error.message : "Unknown error",
  );
}
const zatbillIssuerSecret = process.env.STELLAR_ZATBILL_ISSUER_SECRET_KEY?.trim();
const sponsorSecret = process.env.STELLAR_SPONSOR_SECRET_KEY?.trim();
const dealerSecret = process.env.STELLAR_DEALER_SECRET_KEY?.trim();

let kycService: KycService | null = null;
let sponsorService: SponsorService | null = null;
let walletStore: CustodialWalletStore | null = null;
let sponsorRateLimiter: SponsorRateLimiter | null = null;

if (zatbillIssuerSecret && sponsorSecret && dealerSecret) {
  try {
    const zatbillIssuer = Keypair.fromSecret(zatbillIssuerSecret);
    const sponsor = Keypair.fromSecret(sponsorSecret);
    const dealer = Keypair.fromSecret(dealerSecret);
    const zatbillAsset = new Asset("ZATBILL", zatbillIssuer.publicKey());
    const kycStore = new KycStore(
      process.env.KYC_STATE_PATH?.trim() ||
        path.join(process.cwd(), ".local", "kyc-state.json"),
    );
    kycService = new KycService({
      issuerKeypair: zatbillIssuer,
      sponsorKeypair: sponsor,
      dealerKeypair: dealer,
      horizon,
      zatbillAsset,
      kycStore,
    });

    const encryptionKey = process.env.WALLET_ENCRYPTION_KEY?.trim() ||
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    walletStore = new CustodialWalletStore(
      process.env.WALLET_STORE_PATH?.trim(),
      encryptionKey,
    );
    sponsorRateLimiter = new SponsorRateLimiter(
      process.env.SPONSOR_LIMIT_STATE_PATH?.trim(),
    );
    sponsorService = new SponsorService({
      sponsorKeypair: sponsor,
      horizon,
      walletStore,
      rateLimiter: sponsorRateLimiter,
      kycService,
    });
  } catch (error) {
    console.error(
      "Warning: Could not initialize KYC / Sponsor service due to invalid role keypair.",
      error instanceof Error ? error.message : "Unknown error",
    );
  }
}

function statusCode(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null || !("response" in error)) {
    return undefined;
  }
  const response = error.response;
  if (
    typeof response !== "object" ||
    response === null ||
    !("status" in response)
  ) {
    return undefined;
  }
  return typeof response.status === "number" ? response.status : undefined;
}

function isValidDestination(value: unknown): value is string {
  return isValidStellarPublicKey(value);
}

async function issueMzar(destination: string): Promise<string> {
  const recipient = await horizon
    .loadAccount(destination)
    .catch((error: unknown) => {
      if (statusCode(error) === 404) {
        throw new MzarTrustlineRequiredError();
      }
      throw error;
    });
  const hasTrustline = recipient.balances.some(
    (balance) =>
      "asset_code" in balance &&
      balance.asset_code === mzar.code &&
      balance.asset_issuer === mzar.issuer,
  );
  if (!hasTrustline) {
    throw new MzarTrustlineRequiredError();
  }

  const submit = async (): Promise<string> => {
    const source = await horizon.loadAccount(anchorKeypair.publicKey());
    const transaction = new TransactionBuilder(source, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(
        Operation.payment({
          destination,
          asset: mzar,
          amount: MZAR_FAUCET_AMOUNT,
        }),
      )
      .setTimeout(60)
      .build();
    transaction.sign(anchorKeypair);
    const result = await horizon.submitTransaction(transaction);
    return result.hash;
  };
  const result = mzarSubmissionQueue.then(submit);
  mzarSubmissionQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let length = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    length += buffer.length;
    if (length > 16384) {
      throw new Error("Request body exceeds 16KB.");
    }
    chunks.push(buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
}

function sendJson(
  response: ServerResponse,
  status: number,
  body: Record<string, unknown>,
  retryAfterSeconds?: number,
): void {
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

export const server = createServer(async (request, response) => {
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
    if (!isValidStellarPublicKey(account)) {
      sendJson(response, 400, { error: "account query parameter must be a valid Stellar public key." });
      return;
    }
    try {
      const status = await kycService.getStatus(account);
      sendJson(response, 200, status as unknown as Record<string, unknown>);
    } catch (error) {
      console.error(
        "KYC status check failed:",
        error instanceof Error ? error.message : "Unknown error",
      );
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

    let body: unknown;
    try {
      body = await readJsonBody(request);
    } catch {
      sendJson(response, 400, { error: "Send a valid JSON request." });
      return;
    }

    const payload = body as Partial<VerifyRequest>;
    try {
      const result = await kycService.verify(payload as VerifyRequest);
      sendJson(response, 200, {
        success: true,
        verified: result.verified,
        authorized: result.authorized,
        account: result.account,
        createdAccount: result.createdAccount,
        provisionedTrustline: result.provisionedTrustline,
        transactionHash: result.transactionHash,
      });
    } catch (error) {
      // Never log sensitive payload fields (G1 & G7)
      const sanitized = sanitizeLogPayload(payload);
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

    let body: unknown;
    try {
      body = await readJsonBody(request);
    } catch {
      sendJson(response, 400, { error: "Send a valid JSON request." });
      return;
    }

    const payload = body as { account?: string; reason?: string };
    if (!isValidStellarPublicKey(payload.account)) {
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
    } catch (error) {
      console.error(
        "KYC revocation error:",
        error instanceof Error ? error.message : "Unknown error",
      );
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

    let body: unknown;
    try {
      body = await readJsonBody(request);
    } catch {
      sendJson(response, 400, { error: "Send a valid JSON request." });
      return;
    }

    const payload = body as { destination?: string; amount?: string };
    if (!isValidStellarPublicKey(payload.destination)) {
      sendJson(response, 400, { error: "destination must be a valid Stellar public key." });
      return;
    }

    const result = await kycService.transferDemoZatbill(
      payload.destination,
      payload.amount || "1",
    );
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

    let body: unknown;
    try {
      body = await readJsonBody(request);
    } catch {
      sendJson(response, 400, {
        error: "Send a valid JSON request.",
      });
      return;
    }
    const destination =
      typeof body === "object" && body !== null && "destination" in body
        ? (body as { destination: unknown }).destination
        : undefined;
    if (!isValidDestination(destination)) {
      sendJson(response, 400, {
        error: "destination must be a valid Stellar account public key.",
      });
      return;
    }

    try {
      const result = await claimMzar(
        destination,
        rateLimiter,
        issueMzar,
        Date.now(),
      );
      sendJson(response, result.status, result.body, result.retryAfterSeconds);
    } catch (error) {
      if (error instanceof MzarRateLimitStoreError) {
        sendJson(
          response,
          503,
          {
            error:
              "Faucet rate-limit storage is temporarily unavailable; no payment was submitted.",
          },
          1,
        );
        return;
      }
      console.error(
        "mZAR faucet payment failed; the account cooldown remains in effect.",
        error instanceof Error ? error.message : "Unknown payment error.",
      );
      sendJson(response, 502, {
        error: `Could not complete the Testnet mZAR payment. The account remains rate-limited for ${MZAR_FAUCET_COOLDOWN_MS / 1000} seconds.`,
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
    let body: unknown;
    try {
      body = await readJsonBody(request);
    } catch {
      sendJson(response, 400, { error: "Send a valid JSON request." });
      return;
    }
    const userId =
      typeof body === "object" && body !== null && "userId" in body
        ? String((body as { userId: unknown }).userId).trim()
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
        disclaimer:
          "Prototype only. Private keys are encrypted server-side with WALLET_ENCRYPTION_KEY. Not for Mainnet or real funds.",
      });
    } catch (error) {
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
    let body: unknown;
    try {
      body = await readJsonBody(request);
    } catch {
      sendJson(response, 400, { error: "Send a valid JSON request." });
      return;
    }
    const xdr = typeof body === "object" && body !== null && "innerTxXdr" in body
      ? String((body as { innerTxXdr: unknown }).innerTxXdr).trim()
      : "";
    const userIdOrAccount = typeof body === "object" && body !== null && "userId" in body
      ? String((body as { userId: unknown }).userId).trim()
      : (typeof body === "object" && body !== null && "account" in body
          ? String((body as { account: unknown }).account).trim()
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
    } catch (error) {
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
    let body: unknown;
    try {
      body = await readJsonBody(request);
    } catch {
      sendJson(response, 400, { error: "Send a valid JSON request." });
      return;
    }

    const typedBody = body as {
      userId?: string;
      userExplicitConfirmation?: boolean;
      amountStroops?: string;
      contractId?: string;
    };

    if (!typedBody.userId) {
      sendJson(response, 400, { error: "userId is required." });
      return;
    }
    if (!typedBody.userExplicitConfirmation) {
      sendJson(response, 400, {
        error:
          "userExplicitConfirmation: true is required. Custodial key signing requires explicit user consent in the application UI.",
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
      sendJson(response, 200, result as unknown as Record<string, unknown>);
    } catch (error) {
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
    sendJson(response, 200, stats as unknown as Record<string, unknown>);
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
    if (!isValidStellarPublicKey(account)) {
      sendJson(response, 400, { error: "account query parameter must be a valid Stellar public key." });
      return;
    }
    const challenge = sep24Simulator.buildChallengeTransaction(account);
    sendJson(response, 200, challenge as unknown as Record<string, unknown>);
    return;
  }

  // Route: POST /auth (SEP-10 challenge validation & token issuance)
  if (pathname === "/auth" && request.method === "POST") {
    if (!sep24Simulator) {
      sendJson(response, 503, { error: "SEP-10 auth service not available." });
      return;
    }
    let body: unknown;
    try {
      body = await readJsonBody(request);
    } catch {
      sendJson(response, 400, { error: "Send a valid JSON request." });
      return;
    }
    const tx = typeof body === "object" && body !== null && "transaction" in body
      ? String((body as { transaction: unknown }).transaction).trim()
      : "";
    const account = typeof body === "object" && body !== null && "account" in body
      ? String((body as { account: unknown }).account).trim()
      : "";

    if (!tx || !isValidStellarPublicKey(account)) {
      sendJson(response, 400, { error: "transaction (XDR) and account are required." });
      return;
    }

    try {
      const token = sep24Simulator.verifyChallenge(tx, account);
      sendJson(response, 200, { token });
    } catch (error) {
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
    sendJson(response, 200, info as unknown as Record<string, unknown>);
    return;
  }

  // Route: POST /sep24/transactions/withdraw/interactive
  if (pathname === "/sep24/transactions/withdraw/interactive" && request.method === "POST") {
    if (!sep24Simulator) {
      sendJson(response, 503, { error: "SEP-24 service not available." });
      return;
    }
    let body: unknown;
    try {
      body = await readJsonBody(request);
    } catch {
      sendJson(response, 400, { error: "Send a valid JSON request." });
      return;
    }

    const typedBody = body as {
      account?: string;
      amount?: string;
      asset_code?: string;
      rail?: "instant_bank" | "mobile_money";
      recipient?: string;
    };

    if (!isValidStellarPublicKey(typedBody.account)) {
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
    } catch (error) {
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
    let body: unknown;
    try {
      body = await readJsonBody(request);
    } catch {
      sendJson(response, 400, { error: "Send a valid JSON request." });
      return;
    }

    const typedBody = body as {
      account?: string;
      amount?: string;
      asset_code?: string;
    };

    if (!isValidStellarPublicKey(typedBody.account)) {
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
    } catch (error) {
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
    let body: unknown;
    try {
      body = await readJsonBody(request);
    } catch {
      sendJson(response, 400, { error: "Send a valid JSON request." });
      return;
    }
    const txId = typeof body === "object" && body !== null && "transaction_id" in body
      ? String((body as { transaction_id: unknown }).transaction_id).trim()
      : "";
    const stellarTx = typeof body === "object" && body !== null && "stellar_transaction_id" in body
      ? String((body as { stellar_transaction_id: unknown }).stellar_transaction_id).trim()
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
        disclaimer:
          "SIMULATION ONLY: Simulated local payout completed. No actual fiat or real-world money moved.",
      });
    } catch (error) {
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
    const rail = (reqUrl.searchParams.get("rail") as "instant_bank" | "mobile_money") || "instant_bank";
    const amount = parseFloat(reqUrl.searchParams.get("amount") || "100");
    const quote = sep24Simulator.quotePayout({
      rail,
      recipient: "Simulated User",
      amountMzar: isNaN(amount) ? 100 : amount,
    });
    sendJson(response, 200, quote as unknown as Record<string, unknown>);
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
  server.listen(port, () => {
    console.log(`StockOnChain Testnet API listening on port ${port}.`);
  });
}
