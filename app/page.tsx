"use client";

import { useEffect, useMemo, useState } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
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

const SHARE_URL = "https://basetree.vercel.app";
const SHARE_TEXT = "I just used Base Tree.";

export default function HomePage() {
  const [isMiniAppEnv, setIsMiniAppEnv] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        const fid = context.user?.fid;

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

  const handleShare = async () => {
    try {
      await sdk.actions.composeCast({
        text: SHARE_TEXT,
        embeds: [SHARE_URL],
      });
    } catch (err) {
      console.error("composeCast failed:", err);
      alert("Sharing isn’t available in this client. Try Base app or Warpcast.");
    }
  };

  const scoreDescriptor = useMemo(
    () => describeScore(profile?.neynarScore ?? null),
    [profile?.neynarScore],
  );

  if (isMiniAppEnv === false) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="max-w-md rounded-3xl border border-white/10 bg-card/80 p-6 text-sm text-white/80">
          <div className="text-xs uppercase tracking-[0.25em] text-white/40">
            Farcaster Mini App
          </div>
          <h1 className="mt-3 text-lg font-semibold">Open inside Base App or Warpcast</h1>
          <p className="mt-2 text-sm text-white/60">
            This tool runs as a Farcaster / Base mini app.
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
              <div className="h-10 w-10 animate-pulse rounded-2xl bg-white/10" />
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
          <div className="text-xs uppercase tracking-[0.25em] text-red-200/70">
            Error
          </div>
          <p className="mt-2 text-sm">{error}</p>
        </div>
      </main>
    );
  }

  if (!profile) return null;

  const score = profile.neynarScore;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <div className="relative w-full max-w-md">
        <div className="pointer-events-none absolute inset-0 opacity-60 blur-3xl gradient-ring" />

        <div className="relative overflow-hidden rounded-3xl border border-white/12 bg-gradient-to-b from-white/6 via-card to-black/80 p-5 shadow-glow backdrop-blur-xl">
          {/* Header (fixed alignment, removed “Reputation Lens”) */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              {profile.pfpUrl ? (
                <img
                  src={profile.pfpUrl}
                  alt={profile.username}
                  className="h-12 w-12 shrink-0 rounded-2xl border border-white/15 object-cover"
                />
              ) : (
                <div className="h-12 w-12 shrink-0 rounded-2xl border border-white/10 bg-white/5" />
              )}

              <div className="min-w-0">
                {/* c) Name then username then FID */}
                <div className="truncate text-[17px] font-semibold leading-tight text-white/95">
                  {profile.displayName || profile.username}
                </div>
                <div className="mt-1 truncate text-xs font-medium text-white/60">
                  @{profile.username}
                </div>
                <div className="mt-1 text-[11px] text-white/45">FID: {profile.fid}</div>
              </div>
            </div>

            {/* Right rail (Share + score) */}
            <div className="flex shrink-0 flex-col items-end gap-2">
              <button
                type="button"
                onClick={handleShare}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/12 bg-black/45 px-3 py-2 text-[11px] font-semibold text-white/80 shadow-sm backdrop-blur transition hover:bg-black/60 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/30 active:scale-[0.98]"
                aria-label="Share"
                title="Share"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                  aria-hidden="true"
                >
                  <circle cx="18" cy="5" r="2.5" />
                  <circle cx="6" cy="12" r="2.5" />
                  <circle cx="18" cy="19" r="2.5" />
                  <path d="M8.3 11.2L15.7 6.8" />
                  <path d="M8.3 12.8L15.7 17.2" />
                </svg>
                <span className="leading-none">Share</span>
              </button>

              <div className="rounded-2xl border border-white/12 bg-black/45 px-3 py-2 text-right">
                <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/45">
                  Neynar Score
                </div>
                <div className="mt-1 text-[18px] font-semibold tabular-nums text-white/95">
                  {score != null ? score.toFixed(2) : "N/A"}
                </div>
              </div>
            </div>
          </div>

          {/* Metrics (fix label wrap / misalignment) */}
          <div className="mt-5 grid grid-cols-3 gap-2 text-center">
            {[
              { label: "Followers", value: profile.followerCount.toLocaleString() },
              { label: "Following", value: profile.followingCount.toLocaleString() },
              {
                label: "Follow Ratio",
                value:
                  profile.followingCount === 0
                    ? "—"
                    : (profile.followerCount / profile.followingCount).toFixed(2),
              },
            ].map((item) => (
              <div
                key={item.label}
                className="flex flex-col items-center justify-center rounded-2xl border border-white/12 bg-black/40 px-2 py-3"
              >
                <div className="whitespace-nowrap text-[9px] font-semibold uppercase tracking-[0.16em] text-white/45">
                  {item.label}
                </div>
                <div className="mt-1 text-sm font-semibold tabular-nums text-white/95">
                  {item.value}
                </div>
              </div>
            ))}
          </div>

          {/* Score bar */}
          <div className="mt-5 rounded-2xl border border-white/12 bg-black/50 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/45">
                  Quality signal
                </div>
                <div className="mt-1 text-sm font-semibold text-white/95">
                  {scoreDescriptor.label}
                </div>
              </div>
              <div className="w-28 text-right text-[10px] leading-tight text-white/55">
                Score is between 0 and 1
              </div>
            </div>

            <div className="mt-3 h-2 w-full rounded-full bg-white/10">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-accent-soft via-accent to-emerald-400"
                style={{
                  width:
                    score == null
                      ? "0%"
                      : `${Math.min(Math.max(score * 100, 2), 100)}%`,
                }}
              />
            </div>

            <p className="mt-2 text-[11px] leading-relaxed text-white/60">
              {scoreDescriptor.summary}
            </p>
          </div>

          {/* Tree donation card */}
          <div className="mt-5">
            <DonateTreeCard />
          </div>

          {/* Footer */}
          <div className="mt-4 text-[10px] text-white/40">
            Data via Neynar · updates weekly based on onchain & social graph
          </div>
        </div>
      </div>
    </main>
  );
}
