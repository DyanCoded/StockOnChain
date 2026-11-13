/**
 * scripts/verify-backing.ts
 *
 * CLI verification script for Proof of Backing (T-06):
 * Validates custodian Ed25519 signature, PDF SHA-256 hash, Stellar issuer on-chain anchor,
 * circulating supply, and calculates the exact backing ratio.
 *
 * Supports:
 *   --deficit    Simulates demo under-collateralized warning state
 *   --tamper     Simulates PDF tampering to verify failure detection
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { Keypair } from "@stellar/stellar-sdk";
import { config } from "dotenv";
import {
  assertTestnetConfiguration,
  computeSha256,
  generateCustodianAttestation,
  generateMockCustodyStatementPdf,
  queryOnchainBackingData,
  verifyProofOfBacking,
} from "../packages/chain/src/index.js";

const root = process.cwd();
config({ path: path.join(root, ".env"), quiet: true });
assertTestnetConfiguration();

async function main() {
  const args = process.argv.slice(2);
  const demoDeficit = args.includes("--deficit") || args.includes("--demo_deficit");
  const tamper = args.includes("--tamper") || args.includes("--tamper-pdf");

  console.log("==================================================================");
  console.log("     STOCKONCHAIN - PROOF OF BACKING VERIFICATION (T-06)          ");
  console.log("==================================================================");

  const custodianSecret = process.env.STELLAR_CUSTODIAN_SECRET_KEY?.trim();
  const issuerPub = process.env.STELLAR_ZATBILL_ISSUER_PUBLIC_KEY?.trim();
  const homeDomain = process.env.STELLAR_HOME_DOMAIN?.trim() || "stockonchain.app";

  if (!custodianSecret || !issuerPub) {
    throw new Error("Missing custodian secret or issuer public key in .env");
  }

  const custodianKp = Keypair.fromSecret(custodianSecret);

  // Load PDF buffer
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
  } else {
    pdfBuffer = generateMockCustodyStatementPdf({
      custodianPublicKey: custodianKp.publicKey(),
      issuerPublicKey: issuerPub,
      faceAmountHeld: "1000.00",
      asOfDate: "2026-11-13T12:00:00.000Z",
    });
  }

  const pdfSha256 = computeSha256(pdfBuffer);

  // Generate signed attestation
  const doc = generateCustodianAttestation({
    custodianKeypair: custodianKp,
    issuerPublicKey: issuerPub,
    pdfSha256,
    homeDomain,
    faceAmountHeld: "1000.00",
    unitsHeld: 1000,
    asOfDate: "2026-11-13T12:00:00.000Z",
  });

  // Tamper if flag is requested
  let testPdfBuffer = pdfBuffer;
  if (tamper) {
    console.log("--> SIMULATING PDF TAMPER (Modifying single byte)...");
    testPdfBuffer = Buffer.from(pdfBuffer);
    testPdfBuffer[testPdfBuffer.length - 1] ^= 0xff;
  }

  // Query live Horizon data
  console.log("Querying Stellar Testnet Horizon for live circulating supply and anchor...");
  const { circulatingSupply, onchainHash } = await queryOnchainBackingData({
    issuerPublicKey: issuerPub,
  });

  // Run full proof-of-backing verification
  const result = await verifyProofOfBacking({
    doc,
    pdfBuffer: testPdfBuffer,
    onchainHash,
    circulatingSupply,
    demoDeficit,
  });

  console.log("\n------------------------------------------------------------------");
  console.log("  VERIFICATION AUDIT RESULTS");
  console.log("------------------------------------------------------------------");
  console.log(`Asset:                  ${result.asset.code} (Issuer: ${result.asset.issuer})`);
  console.log(`Mock Custodian:         ${result.custodian.name}`);
  console.log(`Custodian Signer:       ${result.custodian.publicKey}`);
  console.log(`Mock Instrument ID:     ${result.mockInstrumentId}`);
  console.log(`As-of Date:             ${result.asOfDate}`);
  console.log(`Circulating Supply:     ${result.circulatingSupplyFormatted}`);
  console.log(`Attested Reserves:      ${result.attestedReservesFormatted}`);
  console.log(`Backing Ratio:          ${result.backingRatioFormatted}`);
  console.log(`Backing Status:         ${result.status.toUpperCase()}`);
  console.log("------------------------------------------------------------------");
  console.log("  CRYPTOGRAPHIC & ON-CHAIN CHECKS");
  console.log("------------------------------------------------------------------");
  console.log(`[1] Ed25519 Signature:  ${result.verification.signatureValid ? "VALID (MATCH)" : "FAIL (INVALID)"}`);
  console.log(`[2] PDF SHA-256 Digest: ${result.verification.pdfHashMatched ? "VALID (MATCH)" : "FAIL (TAMPER DETECTED)"}`);
  console.log(`[3] On-chain Anchor:    ${result.verification.onchainAnchorMatched ? "VALID (MATCH ON TESTNET)" : "FAIL (MISMATCH)"}`);
  console.log(`    Anchor Value:       ${result.anchors.onchainHash ?? "None"}`);
  console.log(`    Expected Hash:      ${result.anchors.pdfSha256}`);
  console.log(`[4] Overall Status:     ${result.isValid ? "PASSED" : "FAILED"}`);

  if (result.isDemoDeficit) {
    console.log("\n[DEMO DEFICIT MODE ACTIVATED]");
    console.log(`Warning: ${result.warning}`);
  }

  if (result.verification.errors.length > 0) {
    console.log("\n[ERRORS ENCOUNTERED]:");
    for (const err of result.verification.errors) {
      console.log(`  - ${err}`);
    }
  }

  console.log("\n------------------------------------------------------------------");
  console.log("  TRANSPARENCY LINKS & ENDPOINTS");
  console.log("------------------------------------------------------------------");
  console.log(`Attestation Endpoint:   ${result.anchors.attestationUrl}`);
  console.log(`Mock Statement PDF:     ${result.anchors.pdfUrl}`);
  console.log(`Mock IPFS Anchor:       ${result.anchors.ipfsUri}`);
  console.log(`Stellar Issuer Account: https://horizon-testnet.stellar.org/accounts/${result.asset.issuer}`);
  console.log("==================================================================");

  if (!result.isValid && !demoDeficit) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("[FATAL ERROR]:", err);
  process.exit(1);
});
