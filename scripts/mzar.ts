import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
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
  TESTNET_PASSPHRASE,
} from "../packages/chain/src/index.js";

const root = process.cwd();
const envPath = path.join(root, ".env");
const accountsPath = path.join(root, "docs", "ACCOUNTS.md");
const assetCode = "mZAR";

type Issuer = {
  publicKey: string;
  keypair: Keypair;
};

function validateHomeDomain(value: string | undefined): string {
  if (
    !value ||
    value.length > 32 ||
    value.includes("://") ||
    value.includes("/") ||
    !value.includes(".") ||
    !/^[a-z0-9.-]+$/i.test(value)
  ) {
    throw new Error(
      "Set STELLAR_HOME_DOMAIN to the public HTTPS host serving stellar.toml (domain only, at most 32 characters).",
    );
  }
  return value.toLowerCase();
}

function loadIssuer(): Issuer {
  const secretKey = process.env.STELLAR_ANCHOR_SIM_SECRET_KEY?.trim();
  const expectedPublicKey = process.env.STELLAR_ANCHOR_SIM_PUBLIC_KEY?.trim();
  if (!secretKey || !expectedPublicKey) {
    throw new Error(
      "STELLAR_ANCHOR_SIM_SECRET_KEY and STELLAR_ANCHOR_SIM_PUBLIC_KEY are required; run pnpm chain:bootstrap first.",
    );
  }

  let keypair: Keypair;
  try {
    keypair = Keypair.fromSecret(secretKey);
  } catch {
    throw new Error(
      "STELLAR_ANCHOR_SIM_SECRET_KEY is invalid; no key values are printed.",
    );
  }
  const publicKey = keypair.publicKey();
  if (expectedPublicKey !== publicKey) {
    throw new Error(
      "STELLAR_ANCHOR_SIM_PUBLIC_KEY does not match its secret key; no key values are printed.",
    );
  }
  return { publicKey, keypair };
}

function stellarCliEnvironment(issuer?: Issuer): NodeJS.ProcessEnv {
  const env = { ...process.env };
  for (const key of Object.keys(env)) {
    if (
      /^STELLAR_.*_SECRET_KEY$/.test(key) ||
      key === "STELLAR_ACCOUNT" ||
      key === "STELLAR_SIGN_WITH_KEY"
    ) {
      delete env[key];
    }
  }
  if (issuer) {
    env.STELLAR_ACCOUNT = issuer.publicKey;
    env.STELLAR_SIGN_WITH_KEY = issuer.keypair.secret();
  }
  return env;
}

function runStellar(args: string[], issuer?: Issuer): string {
  const result = spawnSync("stellar", args, {
    encoding: "utf8",
    windowsHide: true,
    env: stellarCliEnvironment(issuer),
  });
  if (result.error || result.status !== 0) {
    throw new Error(
      `Stellar CLI command failed (${args.slice(0, 3).join(" ")}); check Testnet connectivity and CLI configuration.`,
    );
  }
  return result.stdout.trim();
}

async function setHomeDomain(
  server: Horizon.Server,
  issuer: Issuer,
  homeDomain: string,
): Promise<void> {
  const account = await server.loadAccount(issuer.publicKey);
  if (account.home_domain === homeDomain) {
    return;
  }
  const transaction = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(Operation.setOptions({ homeDomain }))
    .setTimeout(60)
    .build();
  transaction.sign(issuer.keypair);
  await server.submitTransaction(transaction);
}

function getAssetContractId(asset: Asset): string {
  const output = runStellar([
    "contract",
    "id",
    "asset",
    "--asset",
    `${asset.code}:${asset.issuer}`,
    "--network",
    "testnet",
    "--network-passphrase",
    TESTNET_PASSPHRASE,
    "--rpc-url",
    STELLAR_NETWORKS.testnet.rpcUrl,
  ]);
  const contractId = output.match(/\bC[A-Z2-7]{55}\b/)?.[0];
  if (!contractId) {
    throw new Error("Stellar CLI did not return the mZAR SAC contract ID.");
  }
  return contractId;
}

function ensureSacDeployed(asset: Asset, issuer: Issuer): string {
  const contractId = getAssetContractId(asset);
  const info = spawnSync(
    "stellar",
    [
      "contract",
      "info",
      "interface",
      "--contract-id",
      contractId,
      "--output",
      "json",
      "--network",
      "testnet",
      "--network-passphrase",
      TESTNET_PASSPHRASE,
      "--rpc-url",
      STELLAR_NETWORKS.testnet.rpcUrl,
    ],
    {
      encoding: "utf8",
      windowsHide: true,
      env: stellarCliEnvironment(),
    },
  );
  if (info.status !== 0) {
    runStellar(
      [
        "contract",
        "asset",
        "deploy",
        "--asset",
        `${asset.code}:${asset.issuer}`,
        "--source-account",
        issuer.publicKey,
        "--network",
        "testnet",
        "--network-passphrase",
        TESTNET_PASSPHRASE,
        "--rpc-url",
        STELLAR_NETWORKS.testnet.rpcUrl,
      ],
      issuer,
    );
  }
  return contractId;
}

function saveSacAddress(contractId: string): void {
  const marker = "<!-- BOOTSTRAP-ACCOUNTS:END -->";
  let content = readFileSync(accountsPath, "utf8");
  const row = `| mZAR SAC | \`${contractId}\` |`;
  const existing = /^\| mZAR SAC \|.*$/m;
  if (existing.test(content)) {
    content = content.replace(existing, row);
  } else {
    const markerIndex = content.indexOf(marker);
    if (markerIndex < 0) {
      throw new Error("Account documentation is missing bootstrap markers.");
    }
    content = `${content.slice(0, markerIndex)}${row}\n${content.slice(markerIndex)}`;
  }
  writeFileSync(accountsPath, content, "utf8");
}

export async function setupMzar(): Promise<void> {
  const homeDomain = validateHomeDomain(process.env.STELLAR_HOME_DOMAIN);
  const issuer = loadIssuer();
  const server = new Horizon.Server(STELLAR_NETWORKS.testnet.horizonUrl);
  await setHomeDomain(server, issuer, homeDomain);

  const asset = new Asset(assetCode, issuer.publicKey);
  const sacId = ensureSacDeployed(asset, issuer);
  saveSacAddress(sacId);
  console.log(
    `Configured MOCK mZAR on Stellar Testnet: ${assetCode}:${issuer.publicKey}`,
  );
  console.log(`SAC: ${sacId}`);
  console.log(
    "mZAR is a demo token; no real rand reserves or SEP-24 deposits exist.",
  );
}

async function main(): Promise<void> {
  const dotenvResult = config({ path: envPath, quiet: true });
  if (dotenvResult.error) {
    throw new Error("Could not load .env. Copy .env.example to .env first.");
  }
  assertTestnetConfiguration();
  await setupMzar();
}

if (path.basename(process.argv[1] ?? "") === "mzar.ts") {
  main().catch((error: unknown) => {
    console.error(
      error instanceof Error ? error.message : "mZAR setup failed.",
    );
    process.exitCode = 1;
  });
}
