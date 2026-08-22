import { NextRequest, NextResponse } from "next/server";

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

export async function POST(request: NextRequest) {
  const rpcUrl = process.env.ALCHEMY_BASE_RPC_URL?.trim();
  if (!rpcUrl) {
    return NextResponse.json(
      { error: "Server is missing ALCHEMY_BASE_RPC_URL" },
      { status: 503 },
    );
  }

  let payload: RpcRequest;
  try {
    payload = (await request.json()) as RpcRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON-RPC request" }, { status: 400 });
  }

  if (!payload.method || !ALLOWED_METHODS.has(payload.method)) {
    return NextResponse.json({ error: "RPC method is not allowed" }, { status: 403 });
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
    });
    const body = await response.text();

    return new NextResponse(body, {
      status: response.status,
      headers: { "content-type": "application/json" },
    });
  } catch {
    return NextResponse.json({ error: "Private Base RPC request failed" }, { status: 502 });
  }
}
