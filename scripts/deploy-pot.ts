/**
 * @stockonchain/scripts - Deploy Stokvel Pot to Stellar Testnet (T-04)
 *
 * Compiles and deploys the Stokvel Pot Soroban contract to Stellar Testnet,
 * initializes the state machine and token bindings, and records the deployment
 * contract ID in docs/DEPLOYMENTS.md.
 */

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { config } from "dotenv";
import {
  assertTestnetConfiguration,
  STELLAR_NETWORKS,
  TESTNET_PASSPHRASE,
} from "@stockonchain/chain";

const root = process.cwd();
const envPath = path.join(root, ".env");
const deploymentsPath = path.join(root, "docs", "DEPLOYMENTS.md");
const wasmPath = path.join(
  root,
  "target",
  "wasm32v1-none",
  "release",
  "stokvel_pot.wasm",
);

config({ path: envPath, quiet: true });
assertTestnetConfiguration();

function cleanEnvironment(sourceSecret?: string): NodeJS.ProcessEnv {
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
  if (sourceSecret) {
    env.STELLAR_ACCOUNT = sourceSecret;
  }
  return env;
}

function runStellar(args: string[], sourceSecret?: string): string {
  const result = spawnSync("stellar", args, {
    encoding: "utf8",
    windowsHide: true,
    env: cleanEnvironment(sourceSecret),
  });
  if (result.error || result.status !== 0) {
    const errorDetails = result.stderr || result.stdout || result.error?.message;
    throw new Error(
      `Stellar CLI command failed (${args.slice(0, 3).join(" ")}): ${errorDetails}`,
    );
  }
  return result.stdout.trim();
}

async function main() {
  console.log("=== StockOnChain: Deploying StokvelPot Contract (T-04) ===");

  const adminSecret = process.env.STELLAR_ADMIN_SECRET_KEY?.trim();
  const adminPublic = process.env.STELLAR_ADMIN_PUBLIC_KEY?.trim();
  const dealerPublic = process.env.STELLAR_DEALER_PUBLIC_KEY?.trim();
  const mzarToken =
    process.env.STELLAR_MZAR_CONTRACT_ID?.trim() ||
    "CDH2DYZNE6K5P2EV6JAVTHVVNROLC6TIRWQNFF2OUMBNT36ZCTJPNXXX";
  const zatbillToken =
    process.env.STELLAR_ZATBILL_CONTRACT_ID?.trim() ||
    "CDALMH56TPGL37P4AIELC4FBISERZDRIJZIMIGRGCUNFPW7WLPS27GUR";

  if (!adminSecret || !adminPublic || !dealerPublic) {
    throw new Error(
      "STELLAR_ADMIN_SECRET_KEY, STELLAR_ADMIN_PUBLIC_KEY, and STELLAR_DEALER_PUBLIC_KEY are required in .env",
    );
  }

  // 1. Build contract if wasm is missing
  if (!existsSync(wasmPath)) {
    console.log("Building wasm binary with stellar contract build...");
    execFileSync("stellar", ["contract", "build", "--package", "stokvel-pot"], {
      cwd: root,
      stdio: "inherit",
      windowsHide: true,
    });
  }

  const commonArgs = [
    "--network",
    "testnet",
    "--network-passphrase",
    TESTNET_PASSPHRASE,
    "--rpc-url",
    STELLAR_NETWORKS.testnet.rpcUrl,
  ];

  // 2. Deploy contract to Testnet
  console.log("Submitting contract deploy transaction to Stellar Testnet...");
  const deployOutput = runStellar(
    [
      "contract",
      "deploy",
      "--wasm",
      wasmPath,
      ...commonArgs,
    ],
    adminSecret,
  );

  const contractId = deployOutput.match(/\bC[A-Z2-7]{55}\b/)?.[0];
  if (!contractId) {
    throw new Error(`Deployment did not return a valid contract ID. Output: ${deployOutput}`);
  }
  console.log(`Deployed StokvelPot contract ID: ${contractId}`);

  // 3. Verify version via CLI invocation
  const versionOutput = runStellar(
    [
      "contract",
      "invoke",
      "--id",
      contractId,
      ...commonArgs,
      "--",
      "version",
    ],
    adminSecret,
  );
  console.log(`Contract reported version: ${versionOutput}`);

  // 4. Initialize contract with term and tokens
  const now = Math.floor(Date.now() / 1000);
  const termDuration = 30 * 86400; // 30 days
  const maturityTimestamp = now + termDuration;
  const memberCap = "1000000000"; // 100 mZAR (7 decimals)
  const contributionAmount = "100000000"; // 10 mZAR

  console.log("Initializing StokvelPot contract parameters...");
  runStellar(
    [
      "contract",
      "invoke",
      "--id",
      contractId,
      ...commonArgs,
      "--",
      "init",
      "--admin",
      adminPublic,
      "--dealer",
      dealerPublic,
      "--mzar_token",
      mzarToken,
      "--zatbill_token",
      zatbillToken,
      "--term_duration",
      String(termDuration),
      "--maturity_timestamp",
      String(maturityTimestamp),
      "--member_cap",
      memberCap,
      "--contribution_amount",
      contributionAmount,
    ],
    adminSecret,
  );
  console.log("StokvelPot successfully initialized in state Open.");

  // 5. Record deployment in docs/DEPLOYMENTS.md
  const timestamp = new Date().toISOString();
  const deploymentsDoc = `# Smart Contract Deployments

This document tracks verified Soroban smart contract deployments on Stellar Testnet.

> **AI Guardrail Note (G6):** The smart contracts documented here are unaudited prototype contracts deployed strictly on Stellar Testnet. They carry no real-world financial backing or regulatory guarantees.

| Contract Name | Network | Contract ID | Deployed At | Compiler / Toolchain |
|---|---|---|---|---|
| **StokvelPot (T-04)** | Stellar Testnet | \`${contractId}\` | ${timestamp} | \`stellar 30.0.1\` / \`soroban-sdk 29.0.1\` |
| **ZATBILL SAC (T-01)** | Stellar Testnet | \`${zatbillToken}\` | 2026-11-12 | Stellar Asset Contract (Protocol 22) |
| **mZAR SAC (B-02)** | Stellar Testnet | \`${mzarToken}\` | 2026-11-13 | Stellar Asset Contract (Protocol 22) |

## Contract Addresses & Role Bindings

- **StokvelPot Contract:** \`${contractId}\`
- **Admin Address:** \`${adminPublic}\`
- **Dealer Address:** \`${dealerPublic}\`
- **mZAR Token (SAC):** \`${mzarToken}\`
- **ZATBILL Token (SAC):** \`${zatbillToken}\`
- **Initial Term Duration:** \`${termDuration}\` seconds (30 days)
- **Maturity Timestamp:** \`${maturityTimestamp}\` (${new Date(maturityTimestamp * 1000).toUTCString()})
- **Member Contribution Cap:** \`${memberCap}\` stroops (100 mZAR)

## Verification Commands

To inspect the on-chain interface and status using the Stellar CLI:

\`\`\`sh
stellar contract info interface --contract-id ${contractId} --network testnet
stellar contract invoke --id ${contractId} --network testnet -- get_state
stellar contract invoke --id ${contractId} --network testnet -- version
\`\`\`
`;

  writeFileSync(deploymentsPath, deploymentsDoc, "utf8");
  console.log(`Saved deployment record to ${path.relative(root, deploymentsPath)}.`);

  // 6. Update .env STELLAR_CONTRACT_ID
  let envContent = readFileSync(envPath, "utf8");
  if (/^STELLAR_CONTRACT_ID=.*$/m.test(envContent)) {
    envContent = envContent.replace(
      /^STELLAR_CONTRACT_ID=.*$/m,
      `STELLAR_CONTRACT_ID=${contractId}`,
    );
  } else {
    envContent += `\nSTELLAR_CONTRACT_ID=${contractId}\n`;
  }
  writeFileSync(envPath, envContent, "utf8");
  console.log(`Updated STELLAR_CONTRACT_ID in .env with ${contractId}.`);

  console.log("=== StokvelPot Deployment Complete ===");
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
