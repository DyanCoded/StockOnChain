import { NextResponse } from "next/server";
import { STELLAR_NETWORKS, TESTNET_PASSPHRASE } from "@stockonchain/chain";

export const dynamic = "force-dynamic";

export async function GET() {
  const timestamp = new Date().toISOString();
  const uptime = process.uptime();

  // Testnet network assertion check
  const configuredNetwork = process.env.STELLAR_NETWORK || "testnet";
  const networkPassphrase =
    process.env.STELLAR_NETWORK_PASSPHRASE || TESTNET_PASSPHRASE;
  const isTestnetSafe =
    configuredNetwork === "testnet" && networkPassphrase === TESTNET_PASSPHRASE;

  const checks = {
    testnetGuardrail: isTestnetSafe ? "healthy" : "degraded",
    horizonUrl:
      process.env.STELLAR_HORIZON_URL || STELLAR_NETWORKS.testnet.horizonUrl,
    sorobanRpcUrl:
      process.env.STELLAR_RPC_URL || STELLAR_NETWORKS.testnet.rpcUrl,
    mockModeActive:
      process.env.NEXT_PUBLIC_MOCK_MODE === "true" ||
      process.env.NEXT_PUBLIC_MOCK_MODE === "1",
    services: {
      kyc: "operational",
      faucet: "operational",
      backingAttestation: "operational",
      sep24Cashout: "operational",
      keeper: "operational",
    },
  };

  const status = isTestnetSafe ? "ok" : "degraded";
  const statusCode = isTestnetSafe ? 200 : 503;

  return NextResponse.json(
    {
      status,
      timestamp,
      uptimeSeconds: Math.floor(uptime),
      environment: "stellar-testnet-prototype",
      checks,
    },
    { status: statusCode },
  );
}
