"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { sdk } from "@farcaster/miniapp-sdk";

const RECIPIENT = "0x62233D5483515A79ac06CEcEbac7D399fDF8a99b";
const OTP_VERIFY_URL = "https://onetreeplanted.org/pages/donate-crypto";

// Base Mainnet USDC (6 decimals)
const BASE_USDC_CAIP19 =
  "eip155:8453/erc20:0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

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

// Convert a decimal USDC string (e.g. "0.50") to base units (6 decimals) as a string.
function toUsdcBaseUnits(amountStr: string): string {
  const [wholeRaw, fracRaw = ""] = amountStr.split(".");
  const whole = (wholeRaw || "0").replace(/^0+(?=\d)/, "");
  const frac = (fracRaw + "000000").slice(0, 6);

  // BigInt math avoids float rounding bugs.
  const units = BigInt(whole || "0") * 1_000_000n + BigInt(frac || "0");
  return units.toString();
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
      // We ONLY support native send flow inside Mini App hosts.
      const inMiniApp = await sdk.isInMiniApp();
      if (!inMiniApp) {
        throw new Error("Open this mini app inside Base App or Warpcast to donate.");
      }

      const caps = await sdk.getCapabilities();
      if (!caps.includes("actions.sendToken")) {
        throw new Error("Wallet send is not supported in this client. Please update the app.");
      }

      const result = await sdk.actions.sendToken({
        token: BASE_USDC_CAIP19,
        amount: toUsdcBaseUnits(amount), // 6-decimal base units (e.g. 1 USDC = 1000000)
        recipientAddress: RECIPIENT,
      });

      if (result.success) {
        setTxHash(result.send.transaction);
        setStatus("success");
        startTreeAnimation();
        return;
      }

      if (result.reason === "rejected_by_user") {
        throw new Error("Transaction rejected.");
      }
      throw new Error(result.error?.message ?? "Send failed.");
    } catch (e: any) {
      setStatus("error");
      setError(e?.message ?? "Payment failed.");
    }
  }

  const emoji = stage === 1 ? "🌱" : stage === 2 ? "🌿" : stage === 3 ? "🌳" : "🌱";
  const animText =
    stage === 1
      ? "Seed planted"
      : stage === 2
        ? "Growing…"
        : stage === 3
          ? "Tree planted"
          : "";

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
              Native send flow inside Base / Warpcast.
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
              "rounded-xl border px-2 py-2 text-xs font-semibold transition",
              "disabled:opacity-60",
              preset === "custom"
                ? "border-white/25 bg-white/12 text-white ring-1 ring-white/10"
                : "border-white/12 bg-white/5 text-white/70 hover:border-white/20 hover:bg-white/10",
            ].join(" ")}
          >
            Custom
          </button>
        </div>

        {preset === "custom" && (
          <div className="mt-2 flex items-center gap-2">
            <div className="rounded-xl border border-white/12 bg-black/40 px-2 py-2 text-xs text-white/60">
              $
            </div>
            <input
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              inputMode="decimal"
              disabled={status === "processing"}
              className="w-full rounded-xl border border-white/12 bg-black/40 px-3 py-2 text-xs text-white/85 placeholder:text-white/30 outline-none ring-0 focus:border-white/25"
              placeholder="1.00"
            />
          </div>
        )}

        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="text-[11px] text-white/55">Pick an amount, then pay.</div>
          <button
            type="button"
            onClick={donate}
            disabled={status === "processing"}
            className="rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold text-white/90 transition hover:bg-white/15 disabled:opacity-60"
          >
            {status === "processing" ? "Processing…" : "Pay USDC"}
          </button>
        </div>

        {status === "success" && (
          <div className="mt-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-[11px] text-emerald-50">
            <div className="flex items-center justify-between gap-2">
              <div className="font-semibold">Success</div>
              {txHash ? (
                <div className="font-mono text-[10px] text-emerald-100/80">
                  {shortHash(txHash)}
                </div>
              ) : null}
            </div>
            {showAnim ? (
              <div className="mt-2 flex items-center gap-2">
                <div className="text-base">{emoji}</div>
                <div className="text-emerald-100/90">{animText}</div>
              </div>
            ) : (
              <div className="mt-2 text-emerald-100/90">Thank you for helping plant a tree.</div>
            )}
          </div>
        )}

        {status === "error" && error && (
          <div className="mt-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-[11px] text-red-50">
            {error}
          </div>
        )}

        <div className="mt-3 text-[10px] text-white/40">
          Official One Tree Planted address. Verify:{" "}
          <a
            className="underline decoration-white/20 underline-offset-2 hover:text-white/70"
            href={OTP_VERIFY_URL}
            target="_blank"
            rel="noreferrer"
          >
            onetreeplanted.org/pages/donate-crypto
          </a>
        </div>
      </div>
    </div>
  );
}
