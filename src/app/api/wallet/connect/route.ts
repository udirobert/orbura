/**
 * POST /api/wallet/connect
 *
 * Initializes the WDK wallet from the server-side seed phrase and returns
 * the manager's EVM address. The seed phrase is never exposed to the
 * client — only the derived address.
 */
import { NextResponse } from "next/server";
import { getManagerAddress, isWdkConfigured } from "@/lib/wdk";

export const maxDuration = 10;

export async function POST() {
  if (!isWdkConfigured()) {
    return NextResponse.json(
      { error: "WDK wallet not configured. Set WDK_SEED_PHRASE environment variable." },
      { status: 503 },
    );
  }

  try {
    const address = await getManagerAddress();
    return NextResponse.json({ address });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to initialize wallet";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
