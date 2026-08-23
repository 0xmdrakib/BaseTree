import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http, type Hash } from "viem";
import { base } from "viem/chains";
import {
  checkRateLimit,
  rateLimitHeaders,
  type RateLimitResult,
} from "../_lib/rate-limit";

const TRANSACTION_HASH_PATTERN = /^0x[a-fA-F0-9]{64}$/;

function jsonWithLimit(
  body: Record<string, string | boolean>,
  status: number,
  limit: RateLimitResult,
) {
  return NextResponse.json(body, {
    status,
    headers: rateLimitHeaders(limit, status === 429),
  });
}

export async function GET(request: NextRequest) {
  const limit = await checkRateLimit(request, "receipt");
  if (!limit.success) {
    return jsonWithLimit(
      { error: "Too many receipt checks. Please wait before trying again." },
      429,
      limit,
    );
  }

  const rpcUrl = process.env.ALCHEMY_BASE_RPC_URL?.trim();
  if (!rpcUrl) {
    return jsonWithLimit(
      { error: "Server is missing ALCHEMY_BASE_RPC_URL" },
      503,
      limit,
    );
  }

  const hash = request.nextUrl.searchParams.get("hash");
  if (!hash || !TRANSACTION_HASH_PATTERN.test(hash)) {
    return jsonWithLimit(
      { error: "A valid transaction hash is required" },
      400,
      limit,
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

    return NextResponse.json(
      {
        confirmed: receipt.status === "success",
        status: receipt.status,
        blockNumber: receipt.blockNumber.toString(),
      },
      { headers: rateLimitHeaders(limit) },
    );
  } catch {
    console.error("Alchemy receipt lookup failed");
    return jsonWithLimit(
      { error: "Unable to confirm transaction receipt" },
      504,
      limit,
    );
  }
}
