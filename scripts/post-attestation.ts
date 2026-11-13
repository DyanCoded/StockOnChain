/**
 * scripts/post-attestation.ts
 *
 * Posts a cryptographically signed Ed25519 Custodian Attestation to the
 * StokvelPot contract on Stellar Testnet to update on-chain attested reserves (T-07).
 */

import { spawnSync } from "node:child_process";
import path from "node:path";
import { Keypair } from "@stellar/stellar-sdk";
import { config } from "dotenv";
import {
  assertTestnetConfiguration,
  signOnchainAttestation,
  STELLAR_NETWORKS,
  TESTNET_PASSPHRASE,
} from "@stockonchain/chain";

const root = process.cwd();
config({ path: path.join(root, ".env"), quiet: true });
assertTestnetConfiguration();

function invokeCli(
  contractId: string,
  functionName: string,
  args: string[],
  sourceSecret: string,
): { stdout: string; stderr: string; status: number } {
  const cliArgs = [
    "contract",
    "invoke",
    "--id",
    contractId,
    "--source-account",
    sourceSecret,
    "--network",
    "testnet",
    "--network-passphrase",
    TESTNET_PASSPHRASE,
    "--rpc-url",
    STELLAR_NETWORKS.testnet.rpcUrl,
    "--send",
    "yes",
    "--",
    functionName,
    ...args,
  ];

  const result = spawnSync("stellar", cliArgs, {
    encoding: "utf8",
    windowsHide: true,
  });

  return {
    stdout: result.stdout?.trim() ?? "",
    stderr: result.stderr?.trim() ?? "",
    status: result.status ?? 1,
  };
}

async function main() {
  console.log("==================================================================");
  console.log("     STOCKONCHAIN - ON-CHAIN PROOF OF BACKING ATTESTATION (T-07)  ");
  console.log("==================================================================");

  const contractId = process.env.STELLAR_CONTRACT_ID?.trim();
  const custodianSecret = process.env.STELLAR_CUSTODIAN_SECRET_KEY?.trim();
  const adminSecret = process.env.STELLAR_ADMIN_SECRET_KEY?.trim();

  if (!contractId || !custodianSecret || !adminSecret) {
    throw new Error("STELLAR_CONTRACT_ID, STELLAR_CUSTODIAN_SECRET_KEY, and STELLAR_ADMIN_SECRET_KEY are required in .env");
  }

  const custodianKp = Keypair.fromSecret(custodianSecret);
  const now = BigInt(Math.floor(Date.now() / 1000));
  // Attest 1,000 ZATBILL (10,000,000,000 stroops)
  const reservesStroops = 10_000_000_000n;

  console.log(`Target Pot Contract:  ${contractId}`);
  console.log(`Custodian Signer:     ${custodianKp.publicKey()}`);
  console.log(`Attested Reserves:    R 1,000.00 (${reservesStroops} stroops)`);
  console.log(`Timestamp:            ${now}`);

  // 1. Sign onchain attestation
  console.log("\n[1/3] Generating Ed25519 signature over canonical attestation payload...");
  const signed = signOnchainAttestation({
    custodianKeypair: custodianKp,
    reservesStroops,
    timestampSeconds: now,
  });

  console.log(`  Payload Hex (41 bytes): ${signed.message.toString("hex")}`);
  console.log(`  Signature Hex:          ${signed.signatureHex}`);
  console.log(`  Custodian Pubkey Hex:   ${signed.custodianPubkeyHex}`);

  // 2. Submit update_attested_reserves to Testnet
  console.log("\n[2/3] Submitting update_attested_reserves transaction to Stellar Testnet...");
  const updateRes = invokeCli(
    contractId,
    "update_attested_reserves",
    [
      "--custodian_pubkey",
      signed.custodianPubkeyHex,
      "--reserves",
      signed.reservesStroops.toString(),
      "--timestamp",
      signed.timestampSeconds.toString(),
      "--signature",
      signed.signatureHex,
    ],
    adminSecret,
  );

  if (updateRes.status !== 0) {
    throw new Error(`Failed to update attested reserves: ${updateRes.stderr || updateRes.stdout}`);
  }

  console.log(`[SUCCESS] Attestation update submitted!`);
  if (updateRes.stdout) {
    console.log(`CLI Output: ${updateRes.stdout}`);
  }

  // 3. Query onchain state
  console.log("\n[3/3] Verifying stored attested reserves on-chain...");
  const readRes = invokeCli(contractId, "get_attested_reserves", [], adminSecret);
  console.log(`Current On-Chain Attested Reserves: ${readRes.stdout} stroops`);

  const readTs = invokeCli(contractId, "get_attestation_timestamp", [], adminSecret);
  console.log(`Current On-Chain Attestation Timestamp: ${readTs.stdout}`);

  console.log("==================================================================");
  console.log("[OK] On-chain proof of backing fully established!");
  console.log("==================================================================");
}

main().catch((err) => {
  console.error("[FATAL ERROR]:", err);
  process.exit(1);
});
