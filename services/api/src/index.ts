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

// Initialize KYC & ZATBILL Service if role keys are provided
const zatbillIssuerSecret = process.env.STELLAR_ZATBILL_ISSUER_SECRET_KEY?.trim();
const sponsorSecret = process.env.STELLAR_SPONSOR_SECRET_KEY?.trim();
const dealerSecret = process.env.STELLAR_DEALER_SECRET_KEY?.trim();

let kycService: KycService | null = null;
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
  } catch (error) {
    console.error(
      "Warning: Could not initialize KYC service due to invalid role keypair.",
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
