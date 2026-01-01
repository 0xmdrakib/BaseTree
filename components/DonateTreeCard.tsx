"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { pay } from "@base-org/account";

const RECIPIENT = "0x62233D5483515A79ac06CEcEbac7D399fDF8a99b";
const OTP_VERIFY_URL = "https://onetreeplanted.org/pages/donate-crypto";
const USE_TESTNET = false;

type Preset = "0.10" | "0.50" | "1.00" | "custom";
type Status = "idle" | "processing" | "success" | "error";
type Stage = 0 | 1 | 2 | 3; // 1=🌱, 2=🌿, 3=🌳

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function shortHash(hash: string) {
  return `${hash.slice(0, 10)}…${hash.slice(-8)}`;
}

function sanitizeAmount(input: string) {
  const cleaned = input.replace(/[^0-9.]/g, "");
  const parts = cleaned.split(".");
  const normalized =
    parts.length <= 2 ? cleaned : `${parts[0]}.${parts.slice(1).join("")}`;
  const n = Number(normalized);
  if (!Number.isFinite(n) || n <= 0) return "1.00";
  return n.toFixed(2);
}

export default function DonateTreeCard() {
  const [preset, setPreset] = useState<Preset>("0.50");
  const [custom, setCustom] = useState("1.00");

  const amount = useMemo(
    () => (preset === "custom" ? sanitizeAmount(custom) : preset),
    [preset, custom],
  );

  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  // animation stages
  const [showAnim, setShowAnim] = useState(false);
  const [stage, setStage] = useState<Stage>(0);
  const timers = useRef<number[]>([]);

  // Reset messages when user changes amount (keeps UI clean)
  useEffect(() => {
    if (status !== "processing") {
      setStatus("idle");
      setError(null);
      setTxHash(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, custom]);

  useEffect(() => {
    return () => {
      timers.current.forEach((t) => window.clearTimeout(t));
      timers.current = [];
    };
  }, []);

  function startTreeAnimation() {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];

    setShowAnim(true);
    setStage(1);

    timers.current.push(
      window.setTimeout(() => setStage(2), 380),
      window.setTimeout(() => setStage(3), 820),
      window.setTimeout(() => {
        setShowAnim(false);
        setStage(0);
      }, 1600),
    );
  }

  async function donate() {
    setError(null);
    setTxHash(null);

    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) {
      setStatus("error");
      setError("Enter a valid amount (example: 0.50).");
      return;
    }
    if (n > 500) {
      setStatus("error");
      setError("That amount is too large.");
      return;
    }

    setStatus("processing");

    try {
      const res: any = await pay({
        amount: n.toFixed(2),
        to: RECIPIENT,
        testnet: USE_TESTNET,
      });

      const hash = res?.transactionHash ?? res?.txHash ?? null;
      if (typeof hash === "string" && hash.length > 10) setTxHash(hash);

      setStatus("success");
      startTreeAnimation();
    } catch (e: any) {
      setStatus("error");
      setError(e?.message ?? "Payment failed.");
    }
  }

  const emoji = stage === 1 ? "🌱" : stage === 2 ? "🌿" : stage === 3 ? "🌳" : "🌱";
  const animText =
    stage === 1 ? "Seed planted" : stage === 2 ? "Growing…" : stage === 3 ? "Tree planted" : "";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/12 bg-black/55 p-3">
      {/* subtle premium glow */}
      <div className="pointer-events-none absolute inset-0 opacity-60 blur-3xl gradient-ring" />

      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[9px] font-semibold uppercase tracking-[0.22em] text-white/45">
              Plant a tree
            </div>
            <div className="mt-1 text-sm font-semibold text-white/95">
              Donate USDC on Base
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-white/60">
              One-tap checkout with an onchain receipt.
            </p>
          </div>

          <div className="shrink-0 text-right">
            <div className="text-[10px] text-white/45">Recipient</div>
            <div className="mt-1 rounded-xl border border-white/12 bg-black/40 px-2 py-1 text-[11px] font-semibold text-white/75">
              {shortAddr(RECIPIENT)}
            </div>
          </div>
        </div>

        {/* Presets */}
        <div className="mt-3 grid grid-cols-4 gap-2">
          {(["0.10", "0.50", "1.00"] as const).map((v) => {
            const active = preset === v;
            return (
              <button
                key={v}
                type="button"
                onClick={() => setPreset(v)}
                disabled={status === "processing"}
                className={[
                  "rounded-xl border px-2 py-2 text-xs font-semibold tabular-nums transition",
                  "disabled:opacity-60",
                  active
                    ? "border-white/25 bg-white/12 text-white ring-1 ring-white/10"
                    : "border-white/12 bg-white/5 text-white/70 hover:border-white/20 hover:bg-white/10",
                ].join(" ")}
              >
                ${v}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setPreset("custom")}
            disabled={status === "processing"}
            className={[
              "rounded-xl border px-2 py-2 text-xs font-semibold transition disabled:opacity-60",
              preset === "custom"
                ? "border-white/25 bg-white/12 text-white ring-1 ring-white/10"
                : "border-white/12 bg-white/5 text-white/70 hover:border-white/20 hover:bg-white/10",
            ].join(" ")}
          >
            Custom
          </button>
        </div>

        {/* Custom input */}
        {preset === "custom" ? (
          <div className="mt-2 rounded-xl border border-white/12 bg-black/35 px-3 py-2">
            <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/45">
              Amount (USDC)
            </div>
            <input
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              inputMode="decimal"
              disabled={status === "processing"}
              className="mt-1 w-full bg-transparent text-xs font-semibold text-white outline-none disabled:opacity-60"
              placeholder="1.00"
            />
          </div>
        ) : null}

        {/* Status + button */}
        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="text-[11px] text-white/60">
            {status === "idle" && "Pick an amount, then pay."}
            {status === "processing" && "Waiting for approval…"}
            {status === "success" && "Donation sent. You just planted a tree feeling 🌿"}
            {status === "error" && (error ?? "Payment failed.")}
          </div>

          <button
            type="button"
            onClick={donate}
            disabled={status === "processing"}
            className="shrink-0 rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/15 disabled:opacity-60"
          >
            {status === "processing" ? "Processing…" : "Pay USDC"}
          </button>
        </div>

        {/* Receipt */}
        {txHash ? (
          <div className="mt-3 rounded-xl border border-white/12 bg-black/40 p-3 text-[11px] text-white/70">
            <div className="flex items-center justify-between gap-2">
              <div className="font-semibold text-white/85">Receipt</div>
              <a
                className="text-white/85 underline underline-offset-4"
                href={`https://basescan.org/tx/${txHash}`}
                target="_blank"
                rel="noreferrer"
              >
                {shortHash(txHash)}
              </a>
            </div>

            {/* verification text requested */}
            <div className="mt-2 text-white/55 leading-relaxed">
              Official One Tree Planted address. Verify on their page:{" "}
              <a
                className="text-white/80 underline underline-offset-4"
                href={OTP_VERIFY_URL}
                target="_blank"
                rel="noreferrer"
              >
                onetreeplanted.org/pages/donate-crypto
              </a>
            </div>
          </div>
        ) : (
          <div className="mt-3 text-[10px] text-white/40 leading-relaxed">
            Official One Tree Planted address. Verify:{" "}
            <a
              className="text-white/70 underline underline-offset-4"
              href={OTP_VERIFY_URL}
              target="_blank"
              rel="noreferrer"
            >
              onetreeplanted.org/pages/donate-crypto
            </a>
          </div>
        )}

        {/* Planting animation overlay */}
        {showAnim ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="relative rounded-2xl border border-white/15 bg-black/70 px-5 py-4 text-center shadow-glow sprout-fade">
              <div className="text-3xl sprout-bounce">{emoji}</div>
              <div className="mt-2 text-xs font-semibold text-white/90">
                {animText}
              </div>

              {/* tiny “particles” */}
              <span className="particle p1" />
              <span className="particle p2" />
              <span className="particle p3" />
              <span className="particle p4" />
              <span className="particle p5" />
            </div>
          </div>
        ) : null}
      </div>

      <style jsx global>{`
        .sprout-fade {
          animation: sproutFade 1600ms ease-out both;
        }
        @keyframes sproutFade {
          0% { transform: translateY(10px) scale(0.98); opacity: 0; }
          18% { opacity: 1; }
          85% { opacity: 1; }
          100% { transform: translateY(-8px) scale(1); opacity: 0; }
        }

        .sprout-bounce {
          animation: sproutBounce 500ms ease-out both;
        }
        @keyframes sproutBounce {
          0% { transform: translateY(6px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }

        .particle {
          position: absolute;
          width: 6px;
          height: 6px;
          border-radius: 999px;
          background: rgba(139, 92, 246, 0.85);
          opacity: 0;
          animation: particleUp 900ms ease-out both;
        }
        @keyframes particleUp {
          0% { transform: translate(0, 0) scale(0.9); opacity: 0; }
          20% { opacity: 0.9; }
          100% { transform: translate(var(--x), var(--y)) scale(0.6); opacity: 0; }
        }

        .p1 { left: 16px; top: 16px; --x: -16px; --y: -26px; animation-delay: 80ms; }
        .p2 { right: 16px; top: 18px; --x: 14px; --y: -24px; animation-delay: 120ms; }
        .p3 { left: 20px; bottom: 18px; --x: -10px; --y: 18px; animation-delay: 160ms; background: rgba(16,185,129,0.85); }
        .p4 { right: 22px; bottom: 16px; --x: 12px; --y: 20px; animation-delay: 200ms; background: rgba(59,130,246,0.85); }
        .p5 { left: 50%; top: 10px; --x: 0px; --y: -28px; animation-delay: 140ms; transform: translateX(-50%); }
      `}</style>
    </div>
  );
}
