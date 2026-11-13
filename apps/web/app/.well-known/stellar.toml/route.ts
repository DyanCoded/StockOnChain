export const dynamic = "force-dynamic";
export const revalidate = 0;

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "no-store",
  "Content-Type": "text/plain; charset=utf-8",
};

function quote(value: string): string {
  return JSON.stringify(value);
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers });
}

export function GET() {
  const zatbillIssuer = process.env.STELLAR_ZATBILL_ISSUER_PUBLIC_KEY?.trim();
  const mzarIssuer = process.env.STELLAR_ANCHOR_SIM_PUBLIC_KEY?.trim();
  const homeDomain = process.env.STELLAR_HOME_DOMAIN?.trim();
  if (
    !zatbillIssuer ||
    !mzarIssuer ||
    !homeDomain ||
    homeDomain.length > 32 ||
    !homeDomain.includes(".") ||
    !/^[a-z0-9.-]+$/i.test(homeDomain)
  ) {
    return new Response(
      "ZATBILL Testnet metadata is unavailable until issuer and home-domain configuration is deployed.\n",
      { status: 503, headers },
    );
  }

  const baseUrl = `https://${homeDomain}`;
  const conditions =
    `Testnet demo token only. One token is an illustrative R1.00 face-value claim at example maturity, sold at a discount. No on-chain maturity or fiat redemption is implemented. No reserves or real T-bills. This is not a security, investment, or payment promise. ` +
    `Mock custodian attestation: ${baseUrl}/attestation.json. ` +
    `On-chain anchor: issuer manage_data zatbill_attestation_hash. ` +
    `Transparency: ${baseUrl}/assets.`;
  const toml = [
    'VERSION="2.0.0"',
    'NETWORK_PASSPHRASE="Test SDF Network ; September 2015"',
    `ACCOUNTS=[${quote(zatbillIssuer)}, ${quote(mzarIssuer)}]`,
    "",
    "[[CURRENCIES]]",
    `code=${quote("mZAR")}`,
    `issuer=${quote(mzarIssuer)}`,
    'status="test"',
    "display_decimals=2",
    `name=${quote("MOCK mZAR")}`,
    `desc=${quote("Testnet-only mock rand token. Not a real ZAR stablecoin and not backed by fiat reserves.")}`,
    `conditions=${quote(`Demo token only. The faucet is a Testnet simulation, not a SEP-24 deposit service. No fiat reserves, redemption, or real-world value are represented. Transparency: ${baseUrl}/assets/mzar.`)}`,
    "",
    "",
    "[[CURRENCIES]]",
    `code=${quote("ZATBILL")}`,
    `issuer=${quote(zatbillIssuer)}`,
    'status="test"',
    "display_decimals=2",
    `name=${quote("MOCK ZATBILL")}`,
    `desc=${quote("Testnet-only MOCK stokvel claim; backed by mock custodian signed attestation.")}`,
    `conditions=${quote(conditions)}`,
    `attestation_of_reserve=${quote(`${baseUrl}/attestation.json`)}`,
    "",
  ].join("\n");

  return new Response(toml, { headers });
}
