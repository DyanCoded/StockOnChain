import { NextResponse } from "next/server";
import { getKycService, proxyOrExecute } from "../../_lib/service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  // Attempt proxy to local API service
  const proxied = await proxyOrExecute("/kyc/verify", "POST", body);
  if (proxied) {
    return NextResponse.json(proxied.data, { status: proxied.status });
  }

  // In-process fallback
  const service = getKycService();
  if (!service) {
    return NextResponse.json(
      {
        error:
          "KYC verification service is unavailable in this environment (missing role secrets).",
      },
      { status: 503 },
    );
  }

  try {
    const result = await service.verify(body as any);
    return NextResponse.json({
      success: true,
      verified: result.verified,
      authorized: result.authorized,
      account: result.account,
      createdAccount: result.createdAccount,
      provisionedTrustline: result.provisionedTrustline,
      transactionHash: result.transactionHash,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Verification failed.",
      },
      { status: 400 },
    );
  }
}
