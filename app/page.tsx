import Image from "next/image";
import DonateTreeCard from "../components/DonateTreeCard";
import WalletConnect from "../components/WalletConnect";

export default function HomePage() {
  return (
    <main className="flex min-h-[100svh] w-full flex-col items-center justify-start pt-20 pb-8 sm:justify-center sm:py-8 bg-background px-4">
      <div className="relative w-full max-w-md sm:mt-0">
        <div className="absolute left-4 -top-14 z-30 flex items-center gap-2.5">
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
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-emerald-500/10 text-2xl">
                🌿
              </div>

              <div className="min-w-0">
                <div className="truncate text-[17px] font-semibold leading-tight text-white/95">
                  Anonymous Planter
                </div>
                <div className="mt-1 truncate text-xs font-medium text-white/60">
                  @earth_guardian
                </div>
                <div className="mt-1 text-[11px] text-white/45">
                  Base Network
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
