import { NextRequest, NextResponse } from "next/server";
import {
  checkRateLimit,
  rateLimitHeaders,
  type RateLimitResult,
} from "../_lib/rate-limit";

const MAX_REQUEST_BYTES = 16 * 1024;
const MAX_LOG_BLOCK_RANGE = BigInt(2_000);
const RPC_TIMEOUT_MS = 12_000;

const ALLOWED_METHODS = new Set([
  "eth_blockNumber",
  "eth_call",
  "eth_chainId",
  "eth_estimateGas",
  "eth_feeHistory",
  "eth_gasPrice",
  "eth_getBalance",
  "eth_getBlockByHash",
  "eth_getBlockByNumber",
  "eth_getCode",
  "eth_getLogs",
  "eth_getStorageAt",
  "eth_getTransactionByHash",
  "eth_getTransactionCount",
  "eth_getTransactionReceipt",
  "net_version",
]);

type RpcRequest = {
  id?: string | number | null;
  jsonrpc?: "2.0";
  method?: string;
  params?: unknown[] | Record<string, unknown>;
};

const EXPENSIVE_METHOD_COSTS: Partial<Record<string, number>> = {
  eth_feeHistory: 2,
  eth_getBlockByHash: 2,
  eth_getBlockByNumber: 2,
  eth_getLogs: 5,
};

function jsonWithLimit(
  body: { error: string },
  status: number,
  limit: RateLimitResult,
) {
  return NextResponse.json(body, {
    status,
    headers: rateLimitHeaders(limit, status === 429),
  });
}

function parseHexQuantity(value: unknown) {
  if (typeof value !== "string" || !/^0x[0-9a-fA-F]+$/.test(value)) return null;

  try {
    return BigInt(value);
  } catch {
    return null;
  }
}

function validateRpcParams(payload: RpcRequest) {
  const params = payload.params;
  if (params !== undefined && !Array.isArray(params) && (typeof params !== "object" || !params)) {
    return "JSON-RPC params must be an array or object";
  }

  if (
    (payload.method === "eth_getBlockByHash" || payload.method === "eth_getBlockByNumber") &&
    Array.isArray(params) &&
    params[1] !== undefined &&
    params[1] !== false
  ) {
    return "Full transaction objects are not available through this RPC proxy";
  }

  if (payload.method === "eth_feeHistory" && Array.isArray(params)) {
    const count =
      typeof params[0] === "number" && Number.isSafeInteger(params[0])
        ? BigInt(params[0])
        : parseHexQuantity(params[0]);
    if (count === null || count < BigInt(1) || count > BigInt(100)) {
      return "eth_feeHistory is limited to 100 blocks";
    }
  }

  if (payload.method === "eth_call" && Array.isArray(params)) {
    const call = params[0];
    if (call && typeof call === "object" && "data" in call) {
      const data = (call as { data?: unknown }).data;
      if (typeof data !== "string" || data.length > 16_386) {
        return "eth_call data is too large";
      }
    }
  }

  if (payload.method === "eth_getLogs") {
    if (!Array.isArray(params) || !params[0] || typeof params[0] !== "object") {
      return "eth_getLogs requires a filter";
    }

    const filter = params[0] as Record<string, unknown>;
    if (filter.blockHash !== undefined) {
      if (typeof filter.blockHash !== "string" || !/^0x[a-fA-F0-9]{64}$/.test(filter.blockHash)) {
        return "eth_getLogs blockHash is invalid";
      }
      return null;
    }

    const from = parseHexQuantity(filter.fromBlock);
    const to = parseHexQuantity(filter.toBlock);
    const sameRecentTag =
      typeof filter.fromBlock === "string" &&
      filter.fromBlock === filter.toBlock &&
      ["latest", "pending", "safe", "finalized"].includes(filter.fromBlock);

    if (!sameRecentTag && (from === null || to === null || to < from || to - from > MAX_LOG_BLOCK_RANGE)) {
      return `eth_getLogs is limited to ${MAX_LOG_BLOCK_RANGE.toString()} blocks`;
    }
  }

  return null;
}

export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  const initialLimit = await checkRateLimit(request, "rpc");
  if (!initialLimit.success) {
    return jsonWithLimit(
      { error: "Too many RPC requests. Please wait a moment and try again." },
      429,
      initialLimit,
    );
  }

  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    return jsonWithLimit({ error: "JSON-RPC request is too large" }, 413, initialLimit);
  }

  const rpcUrl = process.env.ALCHEMY_BASE_RPC_URL?.trim();
  if (!rpcUrl) {
    return jsonWithLimit(
      { error: "Server is missing ALCHEMY_BASE_RPC_URL" },
      503,
      initialLimit,
    );
  }

  let payload: RpcRequest;
  try {
    const rawBody = await request.text();
    if (Buffer.byteLength(rawBody, "utf8") > MAX_REQUEST_BYTES) {
      return jsonWithLimit({ error: "JSON-RPC request is too large" }, 413, initialLimit);
    }
    payload = JSON.parse(rawBody) as RpcRequest;
  } catch {
    return jsonWithLimit({ error: "Invalid JSON-RPC request" }, 400, initialLimit);
  }

  if (!payload || Array.isArray(payload) || typeof payload !== "object") {
    return jsonWithLimit({ error: "JSON-RPC batch requests are not supported" }, 400, initialLimit);
  }

  if (payload.jsonrpc !== "2.0" || !payload.method || !ALLOWED_METHODS.has(payload.method)) {
    return jsonWithLimit({ error: "RPC method is not allowed" }, 403, initialLimit);
  }

  if (
    payload.id !== undefined &&
    payload.id !== null &&
    typeof payload.id !== "string" &&
    typeof payload.id !== "number"
  ) {
    return jsonWithLimit({ error: "JSON-RPC id is invalid" }, 400, initialLimit);
  }

  if (typeof payload.id === "string" && payload.id.length > 100) {
    return jsonWithLimit({ error: "JSON-RPC id is too long" }, 400, initialLimit);
  }

  const paramsError = validateRpcParams(payload);
  if (paramsError) {
    return jsonWithLimit({ error: paramsError }, 400, initialLimit);
  }

  const extraCost = (EXPENSIVE_METHOD_COSTS[payload.method] ?? 1) - 1;
  let finalLimit = initialLimit;
  if (extraCost > 0) {
    finalLimit = await checkRateLimit(request, "rpc", extraCost);
    if (!finalLimit.success) {
      return jsonWithLimit(
        { error: "Too many RPC requests. Please wait a moment and try again." },
        429,
        finalLimit,
      );
    }
  }

  try {
    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: payload.id ?? 1,
        jsonrpc: "2.0",
        method: payload.method,
        params: payload.params ?? [],
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(RPC_TIMEOUT_MS),
    });
    const body = await response.text();

    return new NextResponse(body, {
      status: response.status,
      headers: {
        "content-type": "application/json",
        ...rateLimitHeaders(finalLimit),
      },
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "TimeoutError";
    return jsonWithLimit(
      { error: timedOut ? "Private Base RPC request timed out" : "Private Base RPC request failed" },
      timedOut ? 504 : 502,
      finalLimit,
    );
  }
}
