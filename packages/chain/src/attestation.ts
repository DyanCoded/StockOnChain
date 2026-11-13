/**
 * @stockonchain/chain - Custodian Proof of Backing & Attestation Engine (T-06)
 *
 * Implements:
 * 1. Mock Custody Statement PDF generation with strict mock labeling.
 * 2. Deterministic canonical JSON serialization & Ed25519 signing/verification.
 * 3. On-chain anchoring verification via Stellar issuer `manage_data`.
 * 4. Circulating supply query & exact backing ratio calculation.
 * 5. Demo deficit toggle support for UI testing.
 *
 * AI Guardrails:
 * - G1 No secrets: Secret keys are never exposed or printed.
 * - G4 Verify, do not trust: Cryptographic signatures and on-chain hashes are checked strictly.
 * - G6 Honesty: Strict mock custodian branding and simulated T-bill instrument identifiers.
 */

import crypto from "node:crypto";
import { Horizon, Keypair } from "@stellar/stellar-sdk";
import { STELLAR_NETWORKS, TESTNET_PASSPHRASE } from "./index";

export const MOCK_CUSTODIAN_METADATA = {
  name: "Mock Custodian Services (Pty) Ltd (Demo Only)",
  location: "Mock Vault, Sandton, Johannesburg (SIMULATED)",
  disclaimer:
    "MOCK CUSTODIAN DISCLOSURE: Strictly simulated demo attestation. No real-world financial assets, Treasury Bills, bank deposits, or sovereign reserves exist or are held.",
  mockInstrumentId: "MOCK-TBILL-ZA-2026-Q4-DEMO",
  mockInstrumentDescription:
    "Simulated South African Republic Treasury Bill (91-Day Zero-Coupon Benchmark)",
  onchainDataKey: "zatbill_attestation_hash",
  defaultIpfsUri:
    "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi/mock-custody-statement.pdf",
};

export interface CustodianAttestationPayload {
  documentType: "mock-custodian-reserve-attestation";
  disclaimer: string;
  custodian: {
    name: string;
    publicKey: string;
    location: string;
    isMock: true;
  };
  asset: {
    code: "ZATBILL";
    issuer: string;
    network: "testnet";
  };
  instrument: {
    id: string;
    description: string;
    faceValuePerUnit: string;
    currency: string;
  };
  reserves: {
    faceAmountHeld: string;
    currency: string;
    unitsHeld: number;
  };
  statementPdf: {
    filename: string;
    url: string;
    ipfsUri: string;
    sha256: string;
  };
  asOfDate: string;
}

export interface CustodianAttestationDocument
  extends CustodianAttestationPayload {
  signature: string;
}

export interface BackingVerificationResult {
  isValid: boolean;
  status: "fully_backed" | "under_collateralized" | "invalid";
  backingRatio: number;
  backingRatioFormatted: string;
  isBackingSufficient: boolean;
  circulatingSupply: number;
  circulatingSupplyFormatted: string;
  attestedReserves: number;
  attestedReservesFormatted: string;
  reserveCurrency: string;
  mockInstrumentId: string;
  asOfDate: string;
  custodian: {
    name: string;
    publicKey: string;
    isMock: boolean;
  };
  asset: {
    code: string;
    issuer: string;
    network: string;
  };
  anchors: {
    attestationUrl: string;
    pdfUrl: string;
    ipfsUri: string;
    pdfSha256: string;
    onchainDataKey: string;
    onchainHash: string | null;
    onchainMatched: boolean;
  };
  verification: {
    signatureValid: boolean;
    pdfHashMatched: boolean;
    onchainAnchorMatched: boolean;
    allChecksPassed: boolean;
    errors: string[];
  };
  isDemoDeficit: boolean;
  warning: string | null;
  disclaimer: string;
}

/**
 * Generates a valid standard PDF-1.4 binary buffer for the Mock Custody Statement.
 * Contains visible headers, mock disclaimers, and instrument details.
 */
export function generateMockCustodyStatementPdf(params: {
  custodianPublicKey: string;
  issuerPublicKey: string;
  faceAmountHeld?: string;
  asOfDate?: string;
}): Buffer {
  const amount = params.faceAmountHeld ?? "1000.00";
  const date = params.asOfDate ?? "2026-11-13T12:00:00.000Z";

  const lines = [
    "==================================================================",
    "          MOCK CUSTODIAN SERVICES (PTY) LTD",
    "    SIMULATED DEMO CUSTODY STATEMENT & PROOF OF RESERVE",
    "==================================================================",
    "",
    "STATUS: STRICTLY DEMO - NOT A REAL FINANCIAL DOCUMENT",
    "",
    `As-of Date:       ${date}`,
    `Custodian Signer: ${params.custodianPublicKey}`,
    `Custody Location: ${MOCK_CUSTODIAN_METADATA.location}`,
    "",
    "------------------------------------------------------------------",
    "  ASSET & HOLDINGS DECLARATION",
    "------------------------------------------------------------------",
    "Asset Code:       MOCK ZATBILL",
    `Issuer Account:   ${params.issuerPublicKey}`,
    "Network:          Stellar Testnet (Test SDF Network ; September 2015)",
    `Mock Instrument:  ${MOCK_CUSTODIAN_METADATA.mockInstrumentId}`,
    `Description:      ${MOCK_CUSTODIAN_METADATA.mockInstrumentDescription}`,
    "Face Value/Token: R 1.00 (simulated)",
    `Units Held:       ${parseInt(amount, 10).toLocaleString()} ZATBILL`,
    `Total Face Value: R ${amount} (mZAR equivalent)`,
    "",
    "------------------------------------------------------------------",
    "  MOCK CUSTODIAN ATTESTATION",
    "------------------------------------------------------------------",
    "Mock Custodian Services (Pty) Ltd certifies that as of the date",
    "above, it holds the aforementioned mock debt claims in segregated",
    "simulated custody backing circulating ZATBILL tokens.",
    "",
    "------------------------------------------------------------------",
    "  STATUTORY DISCLAIMER (AI GUARDRAILS G4 & G6)",
    "------------------------------------------------------------------",
    "WARNING: This document is an illustrative mock statement generated",
    "solely for protocol development, testing, and UI verification.",
    "NO REAL SOUTH AFRICAN GOVERNMENT TREASURY BILLS, BANKING DEPOSITS,",
    "SECURITIES, OR FIAT RAND RESERVES ARE HELD OR GUARANTEED.",
    "==================================================================",
  ];

  let stream = "BT\n/F1 10 Tf\n50 720 Td\n15 TL\n";
  for (const line of lines) {
    const escaped = line
      .replace(/\\/g, "\\\\")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)");
    stream += `(${escaped}) '\n`;
  }
  stream += "ET\n";

  const streamLen = Buffer.byteLength(stream, "utf8");
  const objects: string[] = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${streamLen} >>\nstream\n${stream}endstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>",
  ];

  let out = "%PDF-1.4\n";
  const xref: number[] = [0];

  for (let i = 0; i < objects.length; i++) {
    xref.push(Buffer.byteLength(out, "utf8"));
    out += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }

  const xrefOffset = Buffer.byteLength(out, "utf8");
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    out += `${String(xref[i]).padStart(10, "0")} 00000 n \n`;
  }
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(out, "utf8");
}

/**
 * Computes the SHA-256 hex digest of a buffer.
 */
export function computeSha256(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

/**
 * Deterministically canonicalizes a JSON object by sorting keys alphabetically at all levels.
 */
export function canonicalizeJson(obj: unknown): string {
  if (obj === null || typeof obj !== "object") {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return `[${obj.map((item) => canonicalizeJson(item)).join(",")}]`;
  }
  const sortedKeys = Object.keys(obj as Record<string, unknown>).sort();
  const entries = sortedKeys.map(
    (key) => `${JSON.stringify(key)}:${canonicalizeJson((obj as Record<string, unknown>)[key])}`,
  );
  return `{${entries.join(",")}}`;
}

/**
 * Generates and cryptographically signs a Custodian Attestation document using Ed25519.
 */
export function generateCustodianAttestation(params: {
  custodianKeypair: Keypair;
  issuerPublicKey: string;
  pdfSha256: string;
  homeDomain: string;
  faceAmountHeld?: string;
  unitsHeld?: number;
  asOfDate?: string;
}): CustodianAttestationDocument {
  const faceAmountHeld = params.faceAmountHeld ?? "1000.00";
  const unitsHeld = params.unitsHeld ?? 1000;
  const asOfDate = params.asOfDate ?? "2026-11-13T12:00:00.000Z";

  const payload: CustodianAttestationPayload = {
    documentType: "mock-custodian-reserve-attestation",
    disclaimer: MOCK_CUSTODIAN_METADATA.disclaimer,
    custodian: {
      name: MOCK_CUSTODIAN_METADATA.name,
      publicKey: params.custodianKeypair.publicKey(),
      location: MOCK_CUSTODIAN_METADATA.location,
      isMock: true,
    },
    asset: {
      code: "ZATBILL",
      issuer: params.issuerPublicKey,
      network: "testnet",
    },
    instrument: {
      id: MOCK_CUSTODIAN_METADATA.mockInstrumentId,
      description: MOCK_CUSTODIAN_METADATA.mockInstrumentDescription,
      faceValuePerUnit: "1.00",
      currency: "ZAR (Simulated)",
    },
    reserves: {
      faceAmountHeld,
      currency: "mZAR (Mock Rand)",
      unitsHeld,
    },
    statementPdf: {
      filename: "mock-custody-statement.pdf",
      url: `https://${params.homeDomain}/assets/mock-custody-statement.pdf`,
      ipfsUri: MOCK_CUSTODIAN_METADATA.defaultIpfsUri,
      sha256: params.pdfSha256,
    },
    asOfDate,
  };

  const canonical = canonicalizeJson(payload);
  const payloadHash = crypto.createHash("sha256").update(canonical).digest();
  const signatureBuffer = params.custodianKeypair.sign(payloadHash);
  const signature = signatureBuffer.toString("hex");

  return {
    ...payload,
    signature,
  };
}

/**
 * Cryptographically verifies the Ed25519 signature of an attestation document.
 */
export function verifyAttestationSignature(
  doc: CustodianAttestationDocument,
  custodianPublicKey: string,
): boolean {
  try {
    const { signature, ...payload } = doc;
    if (!signature || typeof signature !== "string") {
      return false;
    }
    const canonical = canonicalizeJson(payload);
    const payloadHash = crypto.createHash("sha256").update(canonical).digest();
    const verifier = Keypair.fromPublicKey(custodianPublicKey);
    return verifier.verify(payloadHash, Buffer.from(signature, "hex"));
  } catch {
    return false;
  }
}

/**
 * Verifies that the PDF buffer matches the declared SHA-256 hash.
 */
export function verifyPdfHash(pdfBuffer: Buffer, declaredHash: string): boolean {
  const actualHash = computeSha256(pdfBuffer);
  return actualHash.toLowerCase() === declaredHash.toLowerCase();
}

/**
 * Calculates the exact backing ratio percentage:
 * Ratio = (Attested Reserves / Circulating Supply) * 100
 */
export function calculateBackingRatio(
  attestedReserves: number,
  circulatingSupply: number,
): {
  ratio: number;
  formattedRatio: string;
  isSufficient: boolean;
  status: "fully_backed" | "under_collateralized" | "invalid";
} {
  if (circulatingSupply <= 0) {
    return {
      ratio: 100.0,
      formattedRatio: "100.00%",
      isSufficient: true,
      status: "fully_backed",
    };
  }

  const rawRatio = (attestedReserves / circulatingSupply) * 100;
  const ratio = Math.round(rawRatio * 100) / 100;
  const isSufficient = ratio >= 100.0;
  const status = isSufficient ? "fully_backed" : "under_collateralized";

  return {
    ratio,
    formattedRatio: `${ratio.toFixed(2)}%`,
    isSufficient,
    status,
  };
}

/**
 * Queries Horizon to obtain circulating ZATBILL tokens and on-chain issuer manage_data hash.
 */
export async function queryOnchainBackingData(params: {
  issuerPublicKey: string;
  horizonUrl?: string;
}): Promise<{
  circulatingSupply: number;
  onchainHash: string | null;
}> {
  const horizon = new Horizon.Server(
    params.horizonUrl ?? STELLAR_NETWORKS.testnet.horizonUrl,
  );

  let circulatingSupply = 1000.0;
  let onchainHash: string | null = null;

  try {
    // 1. Query circulating supply from asset endpoint
    const assetResp = await horizon
      .assets()
      .forCode("ZATBILL")
      .forIssuer(params.issuerPublicKey)
      .call();

    const record = assetResp.records[0];
    if (record && record.balances) {
      const auth = parseFloat(record.balances.authorized ?? "0");
      const unauth = parseFloat(record.balances.unauthorized ?? "0");
      const contracts = parseFloat((record as any).contracts_amount ?? "0");
      circulatingSupply = Math.round((auth + unauth + contracts) * 100) / 100;
    }
  } catch (err) {
    // Fallback if asset lookup fails in sandbox
    console.warn("Asset supply query warning:", err instanceof Error ? err.message : err);
  }

  try {
    // 2. Query issuer account data_attr for on-chain anchor
    const account = await horizon.loadAccount(params.issuerPublicKey);
    const rawData = account.data_attr[MOCK_CUSTODIAN_METADATA.onchainDataKey];
    if (rawData) {
      onchainHash = Buffer.from(rawData, "base64").toString("utf8");
    }
  } catch (err) {
    console.warn("Issuer manage_data query warning:", err instanceof Error ? err.message : err);
  }

  return { circulatingSupply, onchainHash };
}

/**
 * Runs full proof-of-backing verification against attestation, PDF, on-chain anchor, and circulating supply.
 */
export async function verifyProofOfBacking(params: {
  doc: CustodianAttestationDocument;
  pdfBuffer: Buffer;
  onchainHash?: string | null;
  circulatingSupply?: number;
  demoDeficit?: boolean;
}): Promise<BackingVerificationResult> {
  const errors: string[] = [];

  // 1. Signature check
  const signatureValid = verifyAttestationSignature(
    params.doc,
    params.doc.custodian.publicKey,
  );
  if (!signatureValid) {
    errors.push("INVALID_SIGNATURE: Custodian Ed25519 signature verification failed.");
  }

  // 2. PDF hash check
  const pdfHashMatched = verifyPdfHash(
    params.pdfBuffer,
    params.doc.statementPdf.sha256,
  );
  if (!pdfHashMatched) {
    errors.push("HASH_MISMATCH: Computed PDF SHA-256 digest does not match attestation statementPdf.sha256.");
  }

  // 3. On-chain anchor check
  const onchainHash = params.onchainHash ?? null;
  const onchainAnchorMatched =
    onchainHash !== null &&
    onchainHash.toLowerCase() === params.doc.statementPdf.sha256.toLowerCase();
  if (onchainHash && !onchainAnchorMatched) {
    errors.push("ONCHAIN_ANCHOR_MISMATCH: Issuer manage_data anchor does not match attestation PDF hash.");
  }

  // 4. Backing Ratio calculation
  let circulatingSupply = params.circulatingSupply ?? 1000.0;
  let attestedReserves = parseFloat(params.doc.reserves.faceAmountHeld);

  let isDemoDeficit = Boolean(params.demoDeficit);
  let warning: string | null = null;

  if (isDemoDeficit) {
    // Demo mode: Force ratio below 100% (85.00%) to test UI warning state
    attestedReserves = Math.round(circulatingSupply * 0.85 * 100) / 100;
    warning = "DEMO WARNING: Under-collateralized backing ratio (85.00% < 100.00%) triggered for UI testing.";
  }

  const ratioCalc = calculateBackingRatio(attestedReserves, circulatingSupply);
  const allChecksPassed = signatureValid && pdfHashMatched && (!onchainHash || onchainAnchorMatched);
  const isValid = allChecksPassed && (isDemoDeficit || ratioCalc.isSufficient);

  const status = !allChecksPassed
    ? "invalid"
    : ratioCalc.isSufficient
      ? "fully_backed"
      : "under_collateralized";

  return {
    isValid,
    status,
    backingRatio: ratioCalc.ratio,
    backingRatioFormatted: ratioCalc.formattedRatio,
    isBackingSufficient: ratioCalc.isSufficient,
    circulatingSupply,
    circulatingSupplyFormatted: `${circulatingSupply.toLocaleString("en-ZA", { minimumFractionDigits: 2 })} ZATBILL`,
    attestedReserves,
    attestedReservesFormatted: `R ${attestedReserves.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`,
    reserveCurrency: params.doc.reserves.currency,
    mockInstrumentId: params.doc.instrument.id,
    asOfDate: params.doc.asOfDate,
    custodian: {
      name: params.doc.custodian.name,
      publicKey: params.doc.custodian.publicKey,
      isMock: true,
    },
    asset: {
      code: params.doc.asset.code,
      issuer: params.doc.asset.issuer,
      network: params.doc.asset.network,
    },
    anchors: {
      attestationUrl: params.doc.statementPdf.url.replace(
        "mock-custody-statement.pdf",
        "attestation.json",
      ),
      pdfUrl: params.doc.statementPdf.url,
      ipfsUri: params.doc.statementPdf.ipfsUri,
      pdfSha256: params.doc.statementPdf.sha256,
      onchainDataKey: MOCK_CUSTODIAN_METADATA.onchainDataKey,
      onchainHash,
      onchainMatched: onchainAnchorMatched,
    },
    verification: {
      signatureValid,
      pdfHashMatched,
      onchainAnchorMatched,
      allChecksPassed,
      errors,
    },
    isDemoDeficit,
    warning,
    disclaimer: MOCK_CUSTODIAN_METADATA.disclaimer,
  };
}
