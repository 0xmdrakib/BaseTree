import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";

type LimitName = "rpc" | "receipt";

type LimitConfig = {
  intervalMs: number;
  maxTokens: number;
  refillRate: number;
};

export type RateLimitResult = {
  limit: number;
  remaining: number;
  reset: number;
  success: boolean;
};

type LocalBucket = {
  lastRefill: number;
  tokens: number;
};

const LIMITS: Record<LimitName, LimitConfig> = {
  // Wallet clients often make a short burst of calls while connecting. The
  // bucket permits that burst, then settles at roughly 120 calls per minute.
  rpc: { intervalMs: 10_000, maxTokens: 50, refillRate: 20 },
  // A receipt lookup may poll Alchemy for up to 45 seconds, so it is tighter.
  receipt: { intervalMs: 60_000, maxTokens: 10, refillRate: 5 },
};

const localBuckets = new Map<string, LocalBucket>();

function firstHeaderValue(value: string | null) {
  return value?.split(",", 1)[0]?.trim() || null;
}

function getClientIdentifier(request: NextRequest) {
  const hostname = request.nextUrl.hostname.toLowerCase();
  const isVercelHostname = hostname.endsWith(".vercel.app");
  const cameThroughCloudflare = Boolean(request.headers.get("cf-ray"));

  // On the custom domain Cloudflare supplies the real visitor IP. On a direct
  // *.vercel.app request, prefer Vercel's own non-spoofable forwarding header.
  const cloudflareIp = firstHeaderValue(request.headers.get("cf-connecting-ip"));
  const vercelIp = firstHeaderValue(
    request.headers.get("x-vercel-forwarded-for") ??
      request.headers.get("x-forwarded-for") ??
      request.headers.get("x-real-ip"),
  );

  const source =
    !isVercelHostname && cameThroughCloudflare && cloudflareIp
      ? cloudflareIp
      : vercelIp ?? cloudflareIp ??
        `${request.headers.get("user-agent") ?? "unknown"}:${
          request.headers.get("accept-language") ?? "unknown"
        }`;

  // Avoid keeping a visitor's raw IP address in the local limiter state.
  return createHash("sha256").update(source).digest("hex").slice(0, 32);
}

function cleanLocalBuckets(now: number) {
  if (localBuckets.size < 5_000) return;

  const staleBefore = now - 10 * 60_000;
  for (const [key, bucket] of localBuckets) {
    if (bucket.lastRefill < staleBefore) localBuckets.delete(key);
  }
}

function applyLocalLimit(
  name: LimitName,
  identifier: string,
  cost: number,
): RateLimitResult {
  const config = LIMITS[name];
  const now = Date.now();
  const key = `${name}:${identifier}`;
  const previous = localBuckets.get(key) ?? {
    lastRefill: now,
    tokens: config.maxTokens,
  };
  const elapsed = Math.max(0, now - previous.lastRefill);
  const refilled = (elapsed / config.intervalMs) * config.refillRate;
  const available = Math.min(config.maxTokens, previous.tokens + refilled);
  const success = available >= cost;
  const tokens = success ? available - cost : available;
  const missingTokens = success ? 1 : Math.max(1, cost - tokens);
  const reset = now + Math.ceil((missingTokens / config.refillRate) * config.intervalMs);

  localBuckets.set(key, { lastRefill: now, tokens });
  cleanLocalBuckets(now);

  return {
    success,
    limit: config.maxTokens,
    remaining: Math.max(0, Math.floor(tokens)),
    reset,
  };
}

export function checkRateLimit(
  request: NextRequest,
  name: LimitName,
  cost = 1,
): RateLimitResult {
  const identifier = getClientIdentifier(request);
  const safeCost = Math.max(1, Math.floor(cost));
  return applyLocalLimit(name, identifier, safeCost);
}

export function rateLimitHeaders(result: RateLimitResult, blocked = false) {
  const headers: Record<string, string> = {
    "Cache-Control": "no-store",
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(Math.max(0, result.remaining)),
    "X-RateLimit-Reset": String(Math.ceil(result.reset / 1_000)),
  };

  if (blocked) {
    headers["Retry-After"] = String(
      Math.max(1, Math.ceil((result.reset - Date.now()) / 1_000)),
    );
  }

  return headers;
}
