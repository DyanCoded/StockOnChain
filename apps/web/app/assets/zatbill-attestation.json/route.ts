import {
  generateCustodianAttestation,
  generateMockCustodyStatementPdf,
  computeSha256,
} from "@stockonchain/chain";
import { Keypair } from "@stellar/stellar-sdk";

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

export function GET() {
  const custodianSecret = process.env.STELLAR_CUSTODIAN_SECRET_KEY?.trim();
  const issuerPub = process.env.STELLAR_ZATBILL_ISSUER_PUBLIC_KEY?.trim();
  const homeDomain =
    process.env.STELLAR_HOME_DOMAIN?.trim() || "stockonchain.app";

  if (!custodianSecret || !issuerPub) {
    return Response.json(
      {
        documentType: "transparency-disclosure-not-an-attestation",
        asset: "ZATBILL",
        name: "MOCK ZATBILL",
        network: "testnet",
        issuer: issuerPub ?? null,
        status: "demo-only-no-reserves-attested",
        statement:
          "This document is a transparency disclosure. MOCK ZATBILL is a Testnet demo token. No real T-bills, reserves, yield, regulated product, or payment are represented or promised.",
      },
      { headers },
    );
  }

  const custodianKp = Keypair.fromSecret(custodianSecret);
  const pdfBuffer = generateMockCustodyStatementPdf({
    custodianPublicKey: custodianKp.publicKey(),
    issuerPublicKey: issuerPub,
    faceAmountHeld: "1000.00",
    asOfDate: "2026-11-13T12:00:00.000Z",
  });
  const pdfSha256 = computeSha256(pdfBuffer);

  const document = generateCustodianAttestation({
    custodianKeypair: custodianKp,
    issuerPublicKey: issuerPub,
    pdfSha256,
    homeDomain,
    faceAmountHeld: "1000.00",
    unitsHeld: 1000,
    asOfDate: "2026-11-13T12:00:00.000Z",
  });

  return Response.json(document, { headers });
}
