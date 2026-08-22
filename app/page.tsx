"use client";

import { useEffect, useState } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import Image from "next/image";
import DonateTreeCard from "../components/DonateTreeCard";
import WalletConnect from "../components/WalletConnect";

type Profile = {
  fid: number;
  username: string;
  displayName?: string | null;
  pfpUrl?: string | null;
};

export default function HomePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const initTask = async () => {
        const insideMiniApp = await sdk.isInMiniApp();
        if (!insideMiniApp) return;

        const { user } = await sdk.context;
        if (user?.fid && !cancelled) {
          setProfile({
            fid: user.fid,
            username: user.username ?? `fid_${user.fid}`,
            displayName: user.displayName,
            pfpUrl: user.pfpUrl,
          });
        }

        await sdk.actions.ready();
      };

      try {
        await Promise.race([
          initTask(),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Global Context timeout")), 5000))
        ]);
      } catch (e) {
        console.error("Bootstrap error:", e);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const isAnonymous = !profile;
  const displayProfile: Profile = isAnonymous
    ? {
        fid: 0,
        username: "earth_guardian",
        displayName: "Anonymous Planter",
        pfpUrl: null,
      }
    : profile;

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
              Loading Base Tree…
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-[100svh] w-full flex-col items-center justify-start pt-20 pb-8 sm:justify-center sm:py-8 bg-background px-4">
      <div className="relative w-full max-w-md sm:mt-0">
        <div className="absolute left-4 -top-12 z-30 flex items-center gap-2.5">
          <div className="overflow-hidden rounded-xl border border-white/15 bg-black/40 p-0.5 shadow-lg backdrop-blur-md">
            <Image
              src="/logo.png"
              alt="Base Tree logo"
              width={34}
              height={34}
              priority
              className="h-[34px] w-[34px] rounded-[10px] object-cover"
            />
          </div>
          <span className="text-sm font-semibold tracking-tight text-white/90 drop-shadow-md">
            Base Tree
          </span>
        </div>

        <WalletConnect />

        <div className="pointer-events-none absolute inset-0 opacity-60 blur-3xl gradient-ring" />

        <div className="relative overflow-hidden rounded-3xl border border-white/12 bg-gradient-to-b from-white/6 via-card to-black/80 p-5 shadow-glow backdrop-blur-xl">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              {displayProfile.pfpUrl ? (
                <img
                  src={displayProfile.pfpUrl}
                  alt={displayProfile.username}
                  className="h-12 w-12 shrink-0 rounded-2xl border border-white/15 object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-emerald-500/10 text-2xl">
                  🌿
                </div>
              )}

              <div className="min-w-0">
                <div className="truncate text-[17px] font-semibold leading-tight text-white/95">
                  {displayProfile.displayName || displayProfile.username}
                </div>
                <div className="mt-1 truncate text-xs font-medium text-white/60">
                  @{displayProfile.username}
                </div>
                <div className="mt-1 text-[11px] text-white/45">
                  {isAnonymous ? "Base Network" : `FID: ${displayProfile.fid}`}
                </div>
              </div>
            </div>

            {/* Environmental impact block */}
            <div className="shrink-0 rounded-2xl border border-white/12 bg-black/45 px-3 py-2 text-right">
              <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/45">
                Global Need
              </div>
              <div className="mt-1 text-[18px] font-semibold tabular-nums text-white/95 text-emerald-400">
                High
              </div>
            </div>
          </div>

          {/* Metrics */}
          <div className="mt-5 grid grid-cols-3 gap-2 text-center">
            {[
              { label: "Objective", value: "Plant Trees" },
              { label: "Your Impact", value: "Ready" },
              { label: "Blockchain", value: "Base Mainnet" },
            ].map((item) => (
              <div
                 key={item.label}
                 className="flex flex-col items-center justify-center rounded-2xl border border-white/12 bg-black/40 px-2 py-3"
              >
                <div className="whitespace-nowrap text-[9px] font-semibold uppercase tracking-[0.16em] text-white/45">
                  {item.label}
                </div>
                <div className="mt-1 text-[11px] sm:text-sm font-semibold text-white/95 truncate w-full">
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
                  Signal: Environmental
                </div>
              </div>
              <div className="w-28 text-right text-[10px] leading-tight text-white/55">
                Every wallet matters
              </div>
            </div>

            <div className="mt-3 h-2 w-full rounded-full bg-white/10">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-accent-soft via-accent to-emerald-400"
                style={{
                   width: "100%",
                }}
              />
            </div>

            <p className="mt-2 text-[11px] leading-relaxed text-white/60">
              Planting trees improves global impact. View onchain receipts to verify.
            </p>
          </div>

          {/* Tree donation card */}
          <div className="mt-5">
             <DonateTreeCard />
          </div>

        </div>
      </div>

      <footer className="mt-6 text-center text-[11px] font-semibold text-white/45">
        © 2026 Md. Rakib • made with love and passion.
      </footer>
    </main>
  );
}
