/**
 * GET /api/wallet/balance
 *
 * Returns the manager's USDt treasury balance.
 */
import { NextResponse } from "next/server";
import { getTreasuryBalance, isWdkConfigured } from "@/lib/wdk";

export const maxDuration = 10;

export async function GET() {
  if (!isWdkConfigured()) {
    return NextResponse.json(
      { error: "WDK wallet not configured" },
      { status: 503 },
    );
  }

  try {
    const result = await getTreasuryBalance();
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch balance";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
