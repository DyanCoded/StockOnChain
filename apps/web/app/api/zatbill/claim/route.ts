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

  const proxied = await proxyOrExecute("/zatbill/claim", "POST", body);
  if (proxied) {
    return NextResponse.json(proxied.data, { status: proxied.status });
  }

  const service = getKycService();
  if (!service) {
    return NextResponse.json(
      { error: "ZATBILL demo service unavailable." },
      { status: 503 },
    );
  }

  const payload = body as { destination?: string; amount?: string };
  if (!payload?.destination) {
    return NextResponse.json(
      { error: "destination field is required." },
      { status: 400 },
    );
  }

  const result = await service.transferDemoZatbill(
    payload.destination,
    payload.amount || "1",
  );

  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        error: result.error || "Payment rejected.",
        reason: result.reason,
        code: result.code,
      },
      { status: 403 },
    );
  }

  return NextResponse.json({
    success: true,
    account: result.account,
    amount: result.amount,
    transactionHash: result.transactionHash,
  });
}
