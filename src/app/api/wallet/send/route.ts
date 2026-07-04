/**
 * POST /api/wallet/send
 *
 * Sends a USDt payment from the manager's treasury to a player's EVM address.
 *
 * Body:
 * {
 *   type: "bonus" | "fine" | "tip",
 *   toAddress: "0x...",
 *   amount: number,       // human-readable USDt (e.g. 50 for $50)
 *   note?: string,        // "Player of the match", etc.
 *   playerName?: string,  // for display in payment history
 * }
 */
import { NextRequest, NextResponse } from "next/server";
import { sendPayment, isWdkConfigured } from "@/lib/wdk";
import type { PaymentType, EvmAddress } from "@/lib/wdk/types";

export const maxDuration = 30;

const VALID_TYPES: PaymentType[] = ["bonus", "fine", "tip"];

function isValidEvmAddress(addr: string): addr is EvmAddress {
  return /^0x[a-fA-F0-9]{40}$/.test(addr);
}

export async function POST(request: NextRequest) {
  if (!isWdkConfigured()) {
    return NextResponse.json(
      { error: "WDK wallet not configured" },
      { status: 503 },
    );
  }

  let body: {
    type: PaymentType;
    toAddress: string;
    amount: number;
    note?: string;
    playerName?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Validate type
  if (!VALID_TYPES.includes(body.type)) {
    return NextResponse.json(
      { error: `Invalid payment type. Must be one of: ${VALID_TYPES.join(", ")}` },
      { status: 400 },
    );
  }

  // Validate address
  if (!isValidEvmAddress(body.toAddress)) {
    return NextResponse.json(
      { error: "Invalid EVM address" },
      { status: 400 },
    );
  }

  // Validate amount
  if (typeof body.amount !== "number" || body.amount <= 0) {
    return NextResponse.json(
      { error: "Amount must be a positive number" },
      { status: 400 },
    );
  }

  if (body.amount > 10_000) {
    return NextResponse.json(
      { error: "Amount exceeds $10,000 safety limit" },
      { status: 400 },
    );
  }

  try {
    const result = await sendPayment(
      body.type,
      body.toAddress,
      body.amount,
      body.note,
      body.playerName,
    );
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send payment";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
