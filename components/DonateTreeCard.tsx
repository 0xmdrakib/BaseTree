"use client";

import { useMemo, useState } from "react";
import { pay } from "@base-org/account";

const RECIPIENT = "0x62233D5483515A79ac06CEcEbac7D399fDF8a99b";
const OTP_CRYPTO_URL = "https://onetreeplanted.org/pages/donate-crypto";
const USE_TESTNET = false;

type Preset = "0.10" | "0.50" | "1.00" | "custom";
type Status = "idle" | "processing" | "success" | "error";

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
  if (!Number.isFinite(n) || n <= 0) return "0.10";
  return n.toFixed(2);
}

export default function DonateTreeCard() {
  const [preset, setPreset] = useState<Preset>("0.50");
  const [custom, setCustom] = useState("2.00");

  const amount = useMemo(
    () => (preset === "custom" ? sanitizeAmount(custom) : preset),
    [preset, custom],
  );

  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [showAnim, setShowAnim] = useState(false);

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

      const hash = res?.transactionHash ?? res?.txHash;
      if (typeof hash === "string" && hash.length > 10) setTxHash(hash);

      setStatus("success");
      setShowAnim(true);
      window.setTimeout(() => setShowAnim(false), 1400);
    } catch (e: any) {
      setStatus("error");
      setError(e?.message ?? "Payment failed.");
    }
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/55 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.2em] text-white/40">
            Plant a tree
          </div>
          <div className="mt-1 text-sm font-semibold text-white/90">
            Donate USDC on Base
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-white/60">
            One-tap checkout. You get an onchain receipt (tx hash when available).
          </p>
        </div>

        <div className="shrink-0 text-right text-[10px] text-white/50">
          Recipient
          <div className="mt-1 font-medium text-white/70">
            {shortAddr(RECIPIENT)}
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2">
        {(["0.10", "0.50", "1.00"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setPreset(v)}
            className={`rounded-xl border px-2 py-2 text-xs font-semibold tabular-nums transition ${
              preset === v
                ? "border-white/25 bg-white/10 text-white"
                : "border-white/10 bg-white/5 text-white/70 hover:border-white/20 hover:bg-white/10"
            }`}
          >
            ${v}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setPreset("custom")}
          className={`rounded-xl border px-2 py-2 text-xs font-semibold transition ${
            preset === "custom"
              ? "border-white/25 bg-white/10 text-white"
              : "border-white/10 bg-white/5 text-white/70 hover:border-white/20 hover:bg-white/10"
          }`}
        >
          Custom
        </button>
      </div>

      {preset === "custom" ? (
        <div className="mt-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
          <div className="text-[10px] uppercase tracking-[0.16em] text-white/40">
            Amount (USDC)
          </div>
          <input
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            inputMode="decimal"
            className="mt-1 w-full bg-transparent text-xs font-semibold text-white outline-none"
            placeholder="2.00"
          />
        </div>
      ) : null}

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="text-[11px] text-white/60">
          {status === "idle" && "Pick an amount, then pay."}
          {status === "processing" && "Waiting for approval…"}
          {status === "success" && "Donation sent. Thank you 🌱"}
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

      {txHash ? (
        <div className="mt-3 rounded-xl border border-white/10 bg-black/40 p-3 text-[11px] text-white/70">
          <div className="flex items-center justify-between gap-2">
            <div className="font-medium text-white/80">Transaction</div>
            <a
              className="text-white/80 underline underline-offset-4"
              href={`https://basescan.org/tx/${txHash}`}
              target="_blank"
              rel="noreferrer"
            >
              {shortHash(txHash)}
            </a>
          </div>
          <div className="mt-2 text-white/55">
            Org link:{" "}
            <a
              className="text-white/75 underline underline-offset-4"
              href={OTP_CRYPTO_URL}
              target="_blank"
              rel="noreferrer"
            >
              One Tree Planted
            </a>
          </div>
        </div>
      ) : null}

      {showAnim ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="rounded-2xl border border-white/15 bg-black/60 px-4 py-2 text-xs text-white sprout-pop">
            🌱 Tree planted
          </div>
        </div>
      ) : null}

      <style jsx global>{`
        @keyframes sproutPop {
          0% { transform: translateY(10px); opacity: 0; }
          20% { opacity: 1; }
          100% { transform: translateY(-6px); opacity: 0; }
        }
        .sprout-pop { animation: sproutPop 1400ms ease-out both; }
      `}</style>
    </div>
  );
}
