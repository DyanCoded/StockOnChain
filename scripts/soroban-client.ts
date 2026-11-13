/**
 * @stockonchain/scripts - Soroban Smart Contract Testnet Client
 *
 * Provides typed, verified invocation of Stokvel Pot contract functions
 * with single-signer and multi-party authorization support.
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { config } from "dotenv";
import {
  Address,
  authorizeEntry,
  Contract,
  Horizon,
  Keypair,
  nativeToScVal,
  rpc,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import {
  assertTestnetConfiguration,
  STELLAR_NETWORKS,
  TESTNET_PASSPHRASE,
} from "@stockonchain/chain";

config({ path: path.join(process.cwd(), ".env"), quiet: true });
assertTestnetConfiguration();

export const HORIZON_URL = STELLAR_NETWORKS.testnet.horizonUrl;
export const RPC_URL = STELLAR_NETWORKS.testnet.rpcUrl;

export function horizonServer(): Horizon.Server {
  return new Horizon.Server(HORIZON_URL);
}

export function rpcServer(): rpc.Server {
  return new rpc.Server(RPC_URL);
}

export function testnetTxUrl(hash: string): string {
  return `https://horizon-testnet.stellar.org/transactions/${hash}`;
}

export function stellarExpertTxUrl(hash: string): string {
  return `https://stellar.expert/explorer/testnet/tx/${hash}`;
}

function cleanEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  for (const k of Object.keys(env)) {
    if (
      /^STELLAR_.*_SECRET_KEY$/.test(k) ||
      k === "STELLAR_ACCOUNT" ||
      k === "STELLAR_SIGN_WITH_KEY"
    ) {
      delete env[k];
    }
  }
  return env;
}

/**
 * Executes a single-signer Soroban contract function via Stellar CLI.
 */
export function invokeCli(
  contractId: string,
  functionName: string,
  args: string[],
  sourceSecret: string,
): { hash: string; output: string } {
  const cliArgs = [
    "contract",
    "invoke",
    "--id",
    contractId,
    "--network",
    "testnet",
    "--network-passphrase",
    TESTNET_PASSPHRASE,
    "--rpc-url",
    RPC_URL,
    "--source-account",
    sourceSecret,
    "--send=yes",
    "--",
    functionName,
    ...args,
  ];

  const result = spawnSync("stellar", cliArgs, {
    encoding: "utf8",
    windowsHide: true,
    env: cleanEnv(),
  });

  const fullOutput = `${result.stdout}\n${result.stderr}`;
  if (result.error || result.status !== 0) {
    throw new Error(
      `Soroban invocation '${functionName}' failed:\n${fullOutput.slice(0, 500)}`,
    );
  }

  const hash =
    fullOutput.match(/Signing transaction:\s*([a-f0-9]{64})/i)?.[1] ||
    fullOutput.match(/\/tx\/([a-f0-9]{64})/i)?.[1] ||
    fullOutput.match(/\b([a-f0-9]{64})\b/i)?.[1];

  if (!hash) {
    throw new Error(
      `Could not parse transaction hash from Soroban CLI output:\n${fullOutput}`,
    );
  }

  return { hash, output: result.stdout.trim() };
}

/**
 * Executes the multi-party `invest` contract call requiring both Admin and Dealer authorization.
 */
export async function invokeInvestDualAuth(
  contractId: string,
  adminKp: Keypair,
  dealerKp: Keypair,
  zatbillAmountStroops: bigint,
): Promise<{ hash: string; ledger: number }> {
  const maxRetries = 5;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const rpc = rpcServer();
      const horizon = horizonServer();

      const adminAccount = await horizon.loadAccount(adminKp.publicKey());
      const contract = new Contract(contractId);

      const investOp = contract.call(
        "invest",
        new Address(adminKp.publicKey()).toScVal(),
        new Address(dealerKp.publicKey()).toScVal(),
        nativeToScVal(zatbillAmountStroops, { type: "i128" }),
      );

      const tx = new TransactionBuilder(adminAccount, {
        fee: "100000",
        networkPassphrase: TESTNET_PASSPHRASE,
      })
        .addOperation(investOp)
        .setTimeout(90)
        .build();

      const sim = await rpc.simulateTransaction(tx);
      if (!sim || ("error" in sim && sim.error)) {
        throw new Error(
          `Investment simulation failed: ${sim && "error" in sim ? sim.error : "Unknown error"}`,
        );
      }

      // Use rpc.assembleTransaction to attach Soroban data and resource fee
      const { rpc: rpcModule } = await import("@stellar/stellar-sdk");
      const assembled = rpcModule.assembleTransaction(tx, sim as any).build();

      const latestLedger = await rpc.getLatestLedger();
      const validUntil = latestLedger.sequence + 120;

      // Sign Soroban authorization entries for non-source addresses (Dealer)
      const authEntries = assembled.operations[0].auth ?? [];
      for (let i = 0; i < authEntries.length; i++) {
        const creds = authEntries[i].credentials();
        if (creds.switch().name === "sorobanCredentialsAddress") {
          authEntries[i] = await authorizeEntry(
            authEntries[i],
            dealerKp,
            validUntil,
            TESTNET_PASSPHRASE,
          );
        }
      }

      // Sign transaction envelope with source account (Admin)
      assembled.sign(adminKp);

      const sendResponse = await rpc.sendTransaction(assembled);
      if (sendResponse.status === "ERROR") {
        throw new Error(
          `Transaction submission error: ${JSON.stringify(sendResponse)}`,
        );
      }

      const hash = sendResponse.hash;

      // Poll Horizon for transaction inclusion
      let confirmed = false;
      let ledger = 0;
      for (let poll = 0; poll < 30; poll++) {
        try {
          const txRecord = await horizon.transactions().transaction(hash).call();
          if (txRecord.successful) {
            confirmed = true;
            ledger = txRecord.ledger_attr;
            break;
          }
        } catch {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }

      if (!confirmed) {
        throw new Error(`Transaction ${hash} was not confirmed within 60 seconds.`);
      }

      return { hash, ledger };
    } catch (err) {
      lastError = err;
      const isNetworkError =
        err instanceof Error &&
        (err.message.includes("ECONNABORTED") ||
          err.message.includes("ECONNRESET") ||
          err.message.includes("ETIMEDOUT") ||
          err.message.includes("fetch failed"));

      if (attempt < maxRetries && isNetworkError) {
        const delay = attempt * 2000;
        console.log(`  [Retry ${attempt}/${maxRetries}] Network glitch (${(err as Error).message}), retrying in ${delay}ms...`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }

  throw lastError;
}


/**
 * Deploys a new instance of Stokvel Pot wasm binary to Stellar Testnet.
 */
export function deployPotWasm(adminSecret: string): string {
  const root = process.cwd();
  const wasmPath = path.join(
    root,
    "target",
    "wasm32v1-none",
    "release",
    "stokvel_pot.wasm",
  );

  if (!existsSync(wasmPath)) {
    spawnSync("stellar", ["contract", "build", "--package", "stokvel-pot"], {
      cwd: root,
      stdio: "inherit",
      windowsHide: true,
    });
  }

  const cliArgs = [
    "contract",
    "deploy",
    "--wasm",
    wasmPath,
    "--network",
    "testnet",
    "--network-passphrase",
    TESTNET_PASSPHRASE,
    "--rpc-url",
    RPC_URL,
    "--source-account",
    adminSecret,
  ];

  const result = spawnSync("stellar", cliArgs, {
    encoding: "utf8",
    windowsHide: true,
    env: cleanEnv(),
  });

  const fullOutput = `${result.stdout}\n${result.stderr}`;
  if (result.error || result.status !== 0) {
    throw new Error(`Deployment failed:\n${fullOutput.slice(0, 500)}`);
  }

  const contractId = fullOutput.match(/\bC[A-Z2-7]{55}\b/)?.[0];
  if (!contractId) {
    throw new Error(`No contract ID parsed from deploy output:\n${fullOutput}`);
  }

  return contractId;
}
