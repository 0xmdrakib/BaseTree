"use client";

import { useMemo, useState } from "react";
import { pay, getPaymentStatus } from "@base-org/account";

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

export default function DonateTreeCard() {
    const [preset, setPreset] = useState<"0.10" | "0.50" | "1.00" | "custom">("0.50");
    const [custom, setCustom] = useState("2.00");

    const amount = useMemo(
        () => (preset === "custom" ? clampAmount(custom) : preset),
        [preset, custom]
    );

    const [status, setStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
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
            setError("That amount is too large for this flow.");
            return;
        }

        setStatus("processing");

        try {
            const res: any = await pay({
                amount: Number(n).toFixed(2),
                to: RECIPIENT,
                testnet: USE_TESTNET,
            });

            if (res?.transactionHash) setTxHash(res.transactionHash);

            if (res?.id && !res?.transactionHash) {
                try {
                    const st: any = await getPaymentStatus({ id: res.id, testnet: USE_TESTNET });
                    if (st?.transactionHash) setTxHash(st.transactionHash);
                } catch {
                    // ok: polling not guaranteed
                }
            }

            setStatus("success");
            setShowAnim(true);
            window.setTimeout(() => setShowAnim(false), 1600);
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
                        One tap checkout. You get an onchain receipt.
                    </p>
                </div>

                <div className="shrink-0 text-right text-[10px] text-white/50">
                    Recipient
                    <div className="mt-1 font-medium text-white/70">{shortAddr(RECIPIENT)}</div>
                </div>
            </div>

            <div className="mt-3 grid grid-cols-4 gap-2">
                {(["0.10", "0.50", "1.00"] as const).map((v) => (
                    <button
                        key={v}
                        type="button"
                        onClick={() => setPreset(v)}
                        className={`rounded-xl border px-2 py-2 text-xs font-semibold tabular-nums transition ${preset === v
                                ? "border-white/25 bg-white/10 text-white"
                                : "border-white/10 bg-white/5 text-white/70 hover:border-white/20 hover:bg-white/8"
                            }`}
                    >
                        ${v}
                    </button>
                ))}

                <button
                    type="button"
                    onClick={() => setPreset("custom")}
                    className={`rounded-xl border px-2 py-2 text-xs font-semibold transition ${preset === "custom"
                            ? "border-white/25 bg-white/10 text-white"
                            : "border-white/10 bg-white/5 text-white/70 hover:border-white/20 hover:bg-white/8"
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
                        className="mt-1 w-full bg-transparent text-xs font-semibold text-white outline-none placeholder:text-white/30"
                        placeholder="2.00"
                    />
                </div>
            ) : null}

            <div className="mt-3 flex items-center justify-between gap-3">
                <div className="text-[11px] text-white/60">
                    {status === "idle" && "Pick an amount, then pay."}
                    {status === "processing" && "Waiting for approval…"}
                    {status === "success" && "Donation sent. Onchain proof ready."}
                    {status === "error" && (error ?? "Payment failed.")}
                </div>

                <button
                    type="button"
                    onClick={donate}
                    disabled={status === "processing"}
                    className="shrink-0 rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/15 disabled:opacity-60 disabled:hover:bg-white/10 active:scale-[0.99]"
                >
                    {status === "processing" ? "Processing…" : "Pay USDC"}
                </button>
            </div>

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
                        Verify org:{" "}
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

            {showAnim ? (
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
        </div>
    );
}
