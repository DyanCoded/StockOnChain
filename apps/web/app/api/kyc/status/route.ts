import { NextResponse } from "next/server";
import { getKycService, proxyOrExecute } from "../../_lib/service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const account = searchParams.get("account");

  if (!account) {
    return NextResponse.json(
      { error: "account query parameter is required." },
      { status: 400 },
    );
  }

  // Attempt proxy to local API service
  const proxied = await proxyOrExecute(
    "/kyc/status",
    "GET",
    undefined,
    searchParams.toString(),
  );
  if (proxied) {
    return NextResponse.json(proxied.data, { status: proxied.status });
  }

  // In-process fallback
  const service = getKycService();
  if (!service) {
    return NextResponse.json(
      {
        account,
        verified: false,
        verifiedAt: null,
        revokedAt: null,
        onchain: {
          accountExists: false,
          hasTrustline: false,
          isAuthorized: false,
          isClawbackEnabled: false,
          balance: "0",
        },
      },
      { status: 200 },
    );
  }

  try {
    const status = await service.getStatus(account);
    return NextResponse.json(status);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to get status.",
      },
      { status: 500 },
    );
  }
}
