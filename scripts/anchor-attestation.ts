/**
 * scripts/anchor-attestation.ts
 *
 * Anchors the mock custody statement PDF SHA-256 hash onto the ZATBILL issuer account
 * on Stellar Testnet using Operation.manageData (T-06).
 */

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import {
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
  computeSha256,
  generateMockCustodyStatementPdf,
  MOCK_CUSTODIAN_METADATA,
  STELLAR_NETWORKS,
} from "../packages/chain/src/index.js";

const root = process.cwd();
config({ path: path.join(root, ".env"), quiet: true });
assertTestnetConfiguration();

async function main() {
  console.log("==================================================================");
  console.log("     STOCKONCHAIN - PROOF OF BACKING ON-CHAIN ANCHOR (T-06)       ");
  console.log("==================================================================");

  const issuerSecret = process.env.STELLAR_ZATBILL_ISSUER_SECRET_KEY?.trim();
  const custodianPublic = process.env.STELLAR_CUSTODIAN_PUBLIC_KEY?.trim();

  if (!issuerSecret) {
    throw new Error("STELLAR_ZATBILL_ISSUER_SECRET_KEY is missing from .env.");
  }

  const issuerKeypair = Keypair.fromSecret(issuerSecret);
  const issuerPublic = issuerKeypair.publicKey();

  // 1. Locate or generate statement PDF
  const pdfPath = path.join(
    root,
    "apps",
    "web",
    "public",
    "assets",
    "mock-custody-statement.pdf",
  );
  let pdfBuffer: Buffer;
  if (existsSync(pdfPath)) {
    pdfBuffer = readFileSync(pdfPath);
    console.log(`[OK] Loaded custody statement PDF from: ${pdfPath}`);
  } else {
    pdfBuffer = generateMockCustodyStatementPdf({
      custodianPublicKey: custodianPublic || issuerPublic,
      issuerPublicKey: issuerPublic,
      faceAmountHeld: "1000.00",
      asOfDate: "2026-11-13T12:00:00.000Z",
    });
    console.log(`[OK] Generated deterministic mock custody statement PDF.`);
  }

  const pdfSha256 = computeSha256(pdfBuffer);
  console.log(`[PDF SHA-256]: ${pdfSha256}`);

  // 2. Query Horizon for current on-chain anchor
  const horizon = new Horizon.Server(STELLAR_NETWORKS.testnet.horizonUrl);
  const issuerAccount = await horizon.loadAccount(issuerPublic);
  const rawData =
    issuerAccount.data_attr[MOCK_CUSTODIAN_METADATA.onchainDataKey];
  const currentAnchor = rawData
    ? Buffer.from(rawData, "base64").toString("utf8")
    : null;

  console.log(
    `[CURRENT ANCHOR]: ${currentAnchor ?? "None (key not set on issuer)"}`,
  );

  if (currentAnchor && currentAnchor.toLowerCase() === pdfSha256.toLowerCase()) {
    console.log("[OK] On-chain anchor is already up to date and verified!");
    console.log(
      `Issuer Account: https://horizon-testnet.stellar.org/accounts/${issuerPublic}`,
    );
    return;
  }

  console.log(`Submitting manage_data transaction to Stellar Testnet...`);
  const tx = new TransactionBuilder(issuerAccount, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      Operation.manageData({
        name: MOCK_CUSTODIAN_METADATA.onchainDataKey,
        value: pdfSha256,
      }),
    )
    .setTimeout(30)
    .build();

  tx.sign(issuerKeypair);
  const response = await horizon.submitTransaction(tx);

  console.log("==================================================================");
  console.log("[SUCCESS] On-chain anchor published!");
  console.log(`Transaction Hash: ${response.hash}`);
  console.log(
    `Explorer Link:    https://horizon-testnet.stellar.org/transactions/${response.hash}`,
  );
  console.log("==================================================================");
}

main().catch((err) => {
  console.error("[FATAL ERROR]:", err);
  process.exit(1);
});
