import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http, type Hash } from "viem";
import { base } from "viem/chains";

const TRANSACTION_HASH_PATTERN = /^0x[a-fA-F0-9]{64}$/;

export async function GET(request: NextRequest) {
  const rpcUrl = process.env.ALCHEMY_BASE_RPC_URL?.trim();
  if (!rpcUrl) {
    return NextResponse.json(
      { error: "Server is missing ALCHEMY_BASE_RPC_URL" },
      { status: 503 },
    );
  }

  const hash = request.nextUrl.searchParams.get("hash");
  if (!hash || !TRANSACTION_HASH_PATTERN.test(hash)) {
    return NextResponse.json(
      { error: "A valid transaction hash is required" },
      { status: 400 },
    );
  }

  try {
    const client = createPublicClient({
      chain: base,
      transport: http(rpcUrl),
    });
    const receipt = await client.waitForTransactionReceipt({
      hash: hash as Hash,
      timeout: 45_000,
    });

    return NextResponse.json({
      confirmed: receipt.status === "success",
      status: receipt.status,
      blockNumber: receipt.blockNumber.toString(),
    });
  } catch {
    console.error("Alchemy receipt lookup failed");
    return NextResponse.json(
      { error: "Unable to confirm transaction receipt" },
      { status: 504 },
    );
  }
}
