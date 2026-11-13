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

config({ quiet: true });
assertTestnetConfiguration();

const issuerSecret = process.env.STELLAR_ANCHOR_SIM_SECRET_KEY?.trim();
const expectedIssuer = process.env.STELLAR_ANCHOR_SIM_PUBLIC_KEY?.trim();
if (!issuerSecret || !expectedIssuer) {
  throw new Error(
    "STELLAR_ANCHOR_SIM_SECRET_KEY and STELLAR_ANCHOR_SIM_PUBLIC_KEY are required for the Testnet mZAR faucet.",
  );
}

let issuer: Keypair;
try {
  issuer = Keypair.fromSecret(issuerSecret);
} catch {
  throw new Error(
    "STELLAR_ANCHOR_SIM_SECRET_KEY is invalid; no key values are printed.",
  );
}
if (issuer.publicKey() !== expectedIssuer) {
  throw new Error(
    "STELLAR_ANCHOR_SIM_PUBLIC_KEY does not match its secret key; no key values are printed.",
  );
}

export function getNetworkConfig() {
  assertTestnetConfiguration();
  return STELLAR_NETWORKS.testnet;
}

const horizon = new Horizon.Server(STELLAR_NETWORKS.testnet.horizonUrl);
const mzar = new Asset("mZAR", issuer.publicKey());
const rateLimiter = new MzarRateLimiter(
  process.env.MZAR_FAUCET_STATE_PATH?.trim() ||
    path.join(process.cwd(), ".local", "mzar-faucet-rate-limits.json"),
);
let submissionQueue = Promise.resolve();

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
  if (typeof value !== "string") {
    return false;
  }
  try {
    Keypair.fromPublicKey(value);
    return true;
  } catch {
    return false;
  }
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
    const source = await horizon.loadAccount(issuer.publicKey());
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
    transaction.sign(issuer);
    const result = await horizon.submitTransaction(transaction);
    return result.hash;
  };
  const result = submissionQueue.then(submit);
  submissionQueue = result.then(
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
    if (length > 1024) {
      throw new Error("Request body exceeds 1024 bytes.");
    }
    chunks.push(buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
}

function sendJson(
  response: ServerResponse,
  status: number,
  body: Record<string, string>,
  retryAfterSeconds?: number,
): void {
  response.writeHead(status, {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    ...(retryAfterSeconds === undefined
      ? {}
      : { "Retry-After": String(retryAfterSeconds) }),
  });
  response.end(JSON.stringify(body));
}

const server = createServer(async (request, response) => {
  if (request.url !== "/faucet/mzar") {
    sendJson(response, 404, { error: "Not found." });
    return;
  }
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
      error: "Send a valid JSON request of at most 1024 bytes.",
    });
    return;
  }
  const destination =
    typeof body === "object" && body !== null && "destination" in body
      ? body.destination
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
});

const port = Number(process.env.PORT ?? 3001);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be an integer from 1 through 65535.");
}
server.listen(port, () => {
  console.log(`StockOnChain Testnet API listening on port ${port}.`);
});
