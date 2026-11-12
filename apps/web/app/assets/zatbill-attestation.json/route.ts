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
  return Response.json(
    {
      documentType: "transparency-disclosure-not-an-attestation",
      asset: "ZATBILL",
      name: "MOCK ZATBILL",
      network: "testnet",
      issuer: process.env.STELLAR_ZATBILL_ISSUER_PUBLIC_KEY ?? null,
      status: "demo-only-no-reserves-attested",
      faceValue: {
        amount: "1.00",
        currency: "ZAR (simulated) - not redeemable for fiat",
        maturity:
          "Illustrative only; no on-chain maturity schedule is implemented",
      },
      statement:
        "This document is a transparency disclosure, not a reserve attestation. MOCK ZATBILL is a Testnet demo token. No real T-bills, reserves, yield, regulated product, or payment are represented or promised.",
      explorer: "https://stellar.expert/explorer/testnet",
      sources: [
        "https://developers.stellar.org/docs/tokens/control-asset-access",
        "https://developers.stellar.org/docs/tokens/stellar-asset-contract",
      ],
    },
    { headers },
  );
}
