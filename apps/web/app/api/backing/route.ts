import { NextRequest } from "next/server";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { Keypair } from "@stellar/stellar-sdk";
import {
  generateCustodianAttestation,
  generateMockCustodyStatementPdf,
  computeSha256,
  queryOnchainBackingData,
  verifyProofOfBacking,
} from "@stockonchain/chain";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8",
};

export function OPTIONS() {
  return new Response(null, { status: 204, headers });
}

export async function GET(request: Request | NextRequest) {
  const custodianSecret = process.env.STELLAR_CUSTODIAN_SECRET_KEY?.trim();
  const issuerPub = process.env.STELLAR_ZATBILL_ISSUER_PUBLIC_KEY?.trim();
  const homeDomain = process.env.STELLAR_HOME_DOMAIN?.trim() || "stockonchain.app";

  if (!custodianSecret || !issuerPub) {
    return Response.json(
      { error: "Custodian or Issuer configuration is missing in environment." },
      { status: 503, headers },
    );
  }

  const url = new URL(request.url, `https://${homeDomain}`);
  const demoDeficit =
    url.searchParams.get("demo_deficit") === "true" ||
    url.searchParams.get("deficit") === "true" ||
    url.searchParams.get("mode") === "deficit";

  const custodianKp = Keypair.fromSecret(custodianSecret);

  // Attempt to load PDF from possible project locations, fallback to deterministic generation
  const candidatePdfPaths = [
    path.join(process.cwd(), "apps", "web", "public", "assets", "mock-custody-statement.pdf"),
    path.join(process.cwd(), "public", "assets", "mock-custody-statement.pdf"),
  ];

  let pdfBuffer: Buffer | null = null;
  for (const p of candidatePdfPaths) {
    if (existsSync(p)) {
      pdfBuffer = readFileSync(p);
      break;
    }
  }

  if (!pdfBuffer) {
    pdfBuffer = generateMockCustodyStatementPdf({
      custodianPublicKey: custodianKp.publicKey(),
      issuerPublicKey: issuerPub,
      faceAmountHeld: "1000.00",
      asOfDate: "2026-11-13T12:00:00.000Z",
    });
  }

  const pdfSha256 = computeSha256(pdfBuffer);

  const doc = generateCustodianAttestation({
    custodianKeypair: custodianKp,
    issuerPublicKey: issuerPub,
    pdfSha256,
    homeDomain,
    faceAmountHeld: "1000.00",
    unitsHeld: 1000,
    asOfDate: "2026-11-13T12:00:00.000Z",
  });

  // Query live on-chain backing data from Horizon
  const { circulatingSupply, onchainHash } = await queryOnchainBackingData({
    issuerPublicKey: issuerPub,
  });

  const result = await verifyProofOfBacking({
    doc,
    pdfBuffer,
    onchainHash,
    circulatingSupply,
    demoDeficit,
  });

  return Response.json(result, { headers });
}
