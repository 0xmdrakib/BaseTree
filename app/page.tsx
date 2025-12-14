"use client";

import { useEffect, useMemo, useState } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import { pay, getPaymentStatus } from "@base-org/account";
import DonateTreeCard from "../components/DonateTreeCard";

type Profile = {
  fid: number;
  username: string;
  displayName?: string | null;
  pfpUrl?: string | null;
  followerCount: number;
  followingCount: number;
  neynarScore: number | null;
};

type ScoreDescriptor = {
  label: string;
  summary: string;
};

function describeScore(score: number | null): ScoreDescriptor {
  if (score == null) {
    return {
      label: "No signal yet",
      summary: "Start engaging with good accounts to build your score.",
    };
  }

  if (score >= 0.85) {
    return {
      label: "Signal: Elite",
      summary:
        "You look like a top-tier account. Strong, consistent interactions with the network.",
    };
  }

  if (score >= 0.7) {
    return {
      label: "Signal: High",
      summary: "You are a trusted, high-quality participant in the Farcaster graph.",
    };
  }

  if (score >= 0.55) {
    return {
      label: "Signal: Growing",
      summary:
        "Solid signal. Keep engaging with good accounts to push into the top tier.",
    };
  }

  if (score >= 0.3) {
    return {
      label: "Signal: Emerging",
      summary:
        "You are early in your reputation journey. Thoughtful casts and connections will lift this.",
    };
  }

  return {
    label: "Signal: Low",
    summary:
      "Likely a newer or low-activity account. Activity with reputable users will improve this over time.",
  };
}

const RECIPIENT = "0x62233D5483515A79ac06CEcEbac7D399fDF8a99b";
const OTP_CRYPTO_URL = "https://onetreeplanted.org/pages/donate-crypto";
const USE_TESTNET = false;

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function shortHash(hash: string) {
  return `${hash.slice(0, 10)}…${hash.slice(-8)}`;
}

function clampAmount(input: string) {
  const cleaned = input.replace(/[^\d.]/g, "");
  const parts = cleaned.split(".");
  const normalized =
    parts.length <= 2 ? cleaned : `${parts[0]}.${parts.slice(1).join("")}`;

  const n = Number(normalized);
  if (!Number.isFinite(n) || n <= 0) return "0.10";
  return n.toFixed(2);
}

export default function HomePage() {
  const [isMiniAppEnv, setIsMiniAppEnv] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Donation state
  const [amountPreset, setAmountPreset] = useState<"0.10" | "0.50" | "1.00" | "custom">("0.50");
  const [customAmount, setCustomAmount] = useState("2.00");
  const amount = useMemo(
    () => (amountPreset === "custom" ? clampAmount(customAmount) : amountPreset),
    [amountPreset, customAmount]
  );

  const [donationStatus, setDonationStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [donationError, setDonationError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [showPlantAnim, setShowPlantAnim] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const insideMiniApp = await sdk.isInMiniApp();

        if (!insideMiniApp) {
          setIsMiniAppEnv(false);
          setIsLoading(false);
          return;
        }

        setIsMiniAppEnv(true);

        const context = await sdk.context;
        const user = context.user ?? {};
        const fid = user.fid;

        if (!fid) {
          setError("Could not detect your Farcaster account (missing FID).");
          setIsLoading(false);
          return;
        }

        const res = await fetch(`/api/profile?fid=${fid}`);
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          setError(body?.error ?? "Failed to fetch Neynar profile.");
          setIsLoading(false);
          return;
        }

        const data = (await res.json()) as Profile;
        if (!cancelled) setProfile(data);

        await sdk.actions.ready();
      } catch (e) {
        console.error(e);
        if (!cancelled) setError("Unexpected error while loading your profile.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const scoreDescriptor = useMemo(
    () => describeScore(profile?.neynarScore ?? null),
    [profile?.neynarScore]
  );

  async function handleDonate() {
    setDonationError(null);
    setTxHash(null);

    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) {
      setDonationStatus("error");
      setDonationError("Enter a valid amount (example: 0.50).");
      return;
    }
    if (n > 500) {
      setDonationStatus("error");
      setDonationError("That amount is too large for this flow.");
      return;
    }

    setDonationStatus("processing");

    try {
      // Base Pay checkout: one-tap USDC payment
      const res: any = await pay({
        amount: Number(n).toFixed(2),
        to: RECIPIENT,
        testnet: USE_TESTNET,
      });

      // Some versions return transactionHash; some return an id to poll
      if (res?.transactionHash) setTxHash(res.transactionHash);

      if (res?.id && !res?.transactionHash) {
        try {
          const st: any = await getPaymentStatus({ id: res.id, testnet: USE_TESTNET });
          if (st?.transactionHash) setTxHash(st.transactionHash);
        } catch {
          // ignore polling errors, payment can still be successful
        }
      }

      setDonationStatus("success");
      setShowPlantAnim(true);
      window.setTimeout(() => setShowPlantAnim(false), 1600);
    } catch (e: any) {
      setDonationStatus("error");
      setDonationError(e?.message ?? "Payment failed.");
    }
  }

  if (isMiniAppEnv === false) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="max-w-md rounded-3xl border border-white/10 bg-card/80 p-6 text-sm text-white/80">
          <div className="text-xs uppercase tracking-[0.25em] text-white/40">
            Farcaster Mini App
          </div>
          <h1 className="mt-3 text-lg font-semibold">Open inside Base App or Warpcast</h1>
          <p className="mt-2 text-sm text-white/60">
            This tool is designed to run as a Farcaster / Base mini app. Launch it from a cast
            or your app drawer to see your live Neynar profile and to donate USDC on Base.
          </p>
        </div>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="relative w-full max-w-xs overflow-hidden rounded-3xl border border-white/10 bg-card/80 p-5">
          <div className="pointer-events-none absolute inset-0 opacity-60 blur-3xl gradient-ring" />
          <div className="relative">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 animate-pulse rounded-2xl bg-white/10" />
              <div className="space-y-1">
                <div className="h-3 w-28 animate-pulse rounded-full bg-white/15" />
                <div className="h-2.5 w-16 animate-pulse rounded-full bg-white/10" />
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <div className="h-16 w-full animate-pulse rounded-2xl bg-white/5" />
              <div className="h-16 w-full animate-pulse rounded-2xl bg-white/5" />
            </div>
            <p className="mt-4 text-xs text-white/50">
              Loading your Farcaster graph and Neynar reputation…
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="w-full max-w-xs rounded-3xl border border-red-500/40 bg-red-500/10 p-5 text-sm text-red-50">
          <div className="text-xs uppercase tracking-[0.25em] text-red-200/70">Error</div>
          <p className="mt-2 text-sm">{error}</p>
        </div>
      </main>
    );
  }

  if (!profile) return null;

  const score = profile.neynarScore;

  return (
    <main className="min-h-screen bg-background px-4 py-8">
      <div className="relative mx-auto w-full max-w-md">
        <div className="pointer-events-none absolute inset-0 opacity-60 blur-3xl gradient-ring" />

        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/5 via-card to-black/80 p-5 shadow-glow backdrop-blur-xl">
          {/* Header */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              {profile.pfpUrl && (
                <img
                  src={profile.pfpUrl}
                  alt={profile.username}
                  className="h-12 w-12 shrink-0 rounded-2xl border border-white/15 object-cover"
                />
              )}
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-[0.25em] text-white/40">
                  Reputation Lens
                </div>
                <div className="mt-1 truncate text-lg font-semibold leading-tight">
                  {profile.displayName || profile.username}
                </div>
                <div className="truncate text-xs text-white/50">
                  @{profile.username} · FID {profile.fid}
                </div>
              </div>
            </div>

            <div className="shrink-0 rounded-2xl bg-white/5 px-3 py-2 text-right text-[11px]">
              <div className="text-[9px] uppercase tracking-[0.18em] text-white/40">
                Neynar Score
              </div>
              <div className="mt-1 text-base font-semibold tabular-nums">
                {score != null ? score.toFixed(2) : "N/A"}
              </div>
            </div>
          </div>

          {/* Metrics */}
          <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-2xl border border-white/10 bg-black/40 px-2 py-3">
              <div className="text-[10px] uppercase tracking-[0.18em] text-white/40">
                Followers
              </div>
              <div className="mt-1 text-sm font-semibold tabular-nums">
                {profile.followerCount.toLocaleString()}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/40 px-2 py-3">
              <div className="text-[10px] uppercase tracking-[0.18em] text-white/40">
                Following
              </div>
              <div className="mt-1 text-sm font-semibold tabular-nums">
                {profile.followingCount.toLocaleString()}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/40 px-2 py-3">
              <div className="text-[10px] uppercase tracking-[0.18em] text-white/40">
                Follow Ratio
              </div>
              <div className="mt-1 text-sm font-semibold tabular-nums">
                {profile.followingCount === 0
                  ? "—"
                  : (profile.followerCount / profile.followingCount).toFixed(2)}
              </div>
            </div>
          </div>

          {/* Score bar */}
          <div className="mt-5 rounded-2xl border border-white/10 bg-black/50 p-3 text-xs">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-white/40">
                  Quality signal
                </div>
                <div className="mt-1 text-sm font-semibold">{scoreDescriptor.label}</div>
              </div>
              <div className="w-24 text-right text-[10px] text-white/60">
                Score is between 0 and 1
              </div>
            </div>

            <div className="mt-3 h-2 w-full rounded-full bg-white/10">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-accent-soft via-accent to-emerald-400"
                style={{
                  width:
                    score == null ? "0%" : `${Math.min(Math.max(score * 100, 2), 100)}%`,
                }}
              />
            </div>

            <p className="mt-2 text-[11px] leading-relaxed text-white/60">
              {scoreDescriptor.summary}
            </p>
          </div>

          {/* Plant a Tree (Base Pay) */}
          <div className="relative mt-5 overflow-hidden rounded-2xl border border-white/10 bg-black/55 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-[0.2em] text-white/40">
                  Plant a tree
                </div>
                <div className="mt-1 text-sm font-semibold">Donate USDC on Base</div>
                <p className="mt-1 text-[11px] leading-relaxed text-white/60">
                  One-tap checkout. You get an onchain receipt (tx hash).
                </p>
              </div>

              <div className="shrink-0 text-right text-[10px] text-white/50">
                Recipient
                <div className="mt-1 font-medium text-white/70">{shortAddr(RECIPIENT)}</div>
              </div>
            </div>

            {/* Amount presets */}
            <div className="mt-3 grid grid-cols-4 gap-2">
              {(["0.10", "0.50", "1.00"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setAmountPreset(v)}
                  className={`rounded-xl border px-2 py-2 text-xs font-semibold tabular-nums transition ${amountPreset === v
                      ? "border-white/25 bg-white/10 text-white"
                      : "border-white/10 bg-white/5 text-white/70 hover:border-white/20 hover:bg-white/8"
                    }`}
                >
                  ${v}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setAmountPreset("custom")}
                className={`rounded-xl border px-2 py-2 text-xs font-semibold transition ${amountPreset === "custom"
                    ? "border-white/25 bg-white/10 text-white"
                    : "border-white/10 bg-white/5 text-white/70 hover:border-white/20 hover:bg-white/8"
                  }`}
              >
                Custom
              </button>
            </div>

            {/* Custom input */}
            {amountPreset === "custom" ? (
              <div className="mt-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                <div className="text-[10px] uppercase tracking-[0.16em] text-white/40">
                  Amount (USDC)
                </div>
                <input
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  inputMode="decimal"
                  className="mt-1 w-full bg-transparent text-xs font-semibold text-white outline-none placeholder:text-white/30"
                  placeholder="2.00"
                />
              </div>
            ) : null}

            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="text-[11px] text-white/60">
                {donationStatus === "idle" && "Pick an amount, then pay."}
                {donationStatus === "processing" && "Waiting for approval…"}
                {donationStatus === "success" && "Donation sent. Onchain proof ready."}
                {donationStatus === "error" && (donationError ?? "Payment failed.")}
              </div>

              <button
                type="button"
                onClick={handleDonate}
                disabled={donationStatus === "processing"}
                className="shrink-0 rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/15 disabled:opacity-60 disabled:hover:bg-white/10 active:scale-[0.99]"
              >
                {donationStatus === "processing" ? "Processing…" : "Pay USDC"}
              </button>
            </div>

            {/* Receipt */}
            {txHash ? (
              <div className="mt-3 rounded-xl border border-white/10 bg-black/40 p-3 text-[11px] text-white/70">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium text-white/80">Transaction</div>
                  <a
                    className="text-white/80 underline decoration-white/20 underline-offset-4"
                    href={`https://basescan.org/tx/${txHash}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {shortHash(txHash)}
                  </a>
                </div>

                <div className="mt-2 text-white/55">
                  Verify the org:{" "}
                  <a
                    className="text-white/75 underline decoration-white/20 underline-offset-4"
                    href={OTP_CRYPTO_URL}
                    target="_blank"
                    rel="noreferrer"
                  >
                    One Tree Planted crypto donations
                  </a>
                </div>
              </div>
            ) : null}

            {/* Minimal planted animation */}
            {showPlantAnim ? (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="rounded-2xl border border-white/15 bg-black/60 px-4 py-3 backdrop-blur-xl sprout-pop">
                  <div className="flex items-center gap-3">
                    <div className="text-xl sprout-bounce">🌱</div>
                    <div>
                      <div className="text-xs font-semibold text-white">Planted</div>
                      <div className="text-[11px] text-white/65">
                        Your donation was sent onchain.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* Footer note */}
          <div className="mt-4 flex items-center justify-between text-[10px] text-white/40">
            <span>Data via Neynar · updates weekly based on onchain & social graph</span>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes sproutPop {
          0% { transform: translateY(10px) scale(0.96); opacity: 0; }
          20% { opacity: 1; }
          60% { transform: translateY(0px) scale(1); }
          100% { transform: translateY(-6px) scale(1.02); opacity: 0; }
        }
        @keyframes sproutBounce {
          0% { transform: translateY(0); }
          40% { transform: translateY(-4px); }
          100% { transform: translateY(0); }
        }
        .sprout-pop { animation: sproutPop 1600ms ease-out both; }
        .sprout-bounce { animation: sproutBounce 700ms ease-out both; }
      `}</style>
    </main>
  );
}
