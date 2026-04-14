"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { pay } from "@base-org/account";
import { sdk } from "@farcaster/miniapp-sdk";
import { encodeFunctionData, parseUnits, concatHex } from "viem";
import { Attribution } from "ox/erc8021";
import { useWallet } from "./WalletProvider";

const RECIPIENT = "0x62233D5483515A79ac06CEcEbac7D399fDF8a99b";
const OTP_VERIFY_URL = "https://onetreeplanted.org/pages/donate-crypto";
const USE_TESTNET = false;

// Add your Builder Code here from base.dev
const BUILDER_CODE = "bc_uu5mz1sd"; // Replace with your actual Builder Code
const DATA_SUFFIX = Attribution.toDataSuffix({ codes: [BUILDER_CODE] });

// Base Mainnet USDC (6 decimals)
const BASE_USDC_CAIP19 =
  "eip155:8453/erc20:0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

const BASE_USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const BASE_CHAIN_ID_HEX = "0x2105"; // 8453

const ERC20_TRANSFER_ABI = [
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;


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
  // viem handles decimals safely and avoids floating point rounding issues
  return parseUnits(amountStr, 6).toString();
}

async function sendUsdcViaEthereumProvider(amountStr: string): Promise<string> {
  const provider: any = await sdk.wallet.getEthereumProvider();

  // Ensure we have an account
  const accounts: string[] =
    (await provider.request({ method: "eth_requestAccounts" }).catch(() =>
      provider.request({ method: "eth_accounts" }),
    )) ?? [];

  const from = accounts?.[0];
  if (!from) throw new Error("Wallet not connected.");

  // Ensure we are on Base
  const chainId: string | null = await provider
    .request({ method: "eth_chainId" })
    .catch(() => null);

  if (chainId && chainId.toLowerCase() !== BASE_CHAIN_ID_HEX) {
    try {
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: BASE_CHAIN_ID_HEX }],
      });
    } catch {
      throw new Error("Please switch your wallet network to Base and try again.");
    }
  }

  const value = parseUnits(amountStr, 6);
  const data = encodeFunctionData({
    abi: ERC20_TRANSFER_ABI,
    functionName: "transfer",
    args: [RECIPIENT, value],
  });

  const dataWithBuilderCode = concatHex([data, DATA_SUFFIX as `0x${string}`]);

  const txHash: string = await provider.request({
    method: "eth_sendTransaction",
    params: [
      {
        from,
        to: BASE_USDC_ADDRESS,
        data: dataWithBuilderCode,
        value: "0x0",
      },
    ],
  });

  if (!txHash || typeof txHash !== "string") throw new Error("Transaction failed.");
  return txHash;
}

export default function DonateTreeCard() {
  const { providerDetails, address: connectedAddress } = useWallet();
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
      window.setTimeout(() => setStage(2), 800),
      window.setTimeout(() => setStage(3), 1800),
      window.setTimeout(() => {
        setShowAnim(false);
        setStage(0);
      }, 3000),
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
      // ✅ Mini App hosts (Base app + Warpcast): prefer direct tx via Ethereum provider.
// This shows the native "Confirm transaction" sheet (like your screenshots) instead of the
// generic "Send" flow opened by actions.sendToken.
const inMiniApp = await sdk.isInMiniApp().catch(() => false);
if (inMiniApp) {
  const capabilities = await sdk.getCapabilities().catch(() => [] as string[]);

  // Best UX: direct EIP-1193 provider → eth_sendTransaction (confirm sheet)
  if (capabilities.includes("wallet.getEthereumProvider")) {
    const hash = await sendUsdcViaEthereumProvider(amount);
    setTxHash(hash);
    setStatus("success");
    startTreeAnimation();
    return;
  }

  // Fallback UX: prefilled send form (host-controlled)
  if (capabilities.includes("actions.sendToken")) {
    const result = await sdk.actions.sendToken({
      token: BASE_USDC_CAIP19,
      amount: toUsdcBaseUnits(amount), // 6-decimal base units
      recipientAddress: RECIPIENT,
    });

    if (result?.success) {
      setTxHash(result.send.transaction);
      setStatus("success");
      startTreeAnimation();
      return;
    }

    // `reason` is a stable enum: rejected_by_user | send_failed
    if (result?.reason === "rejected_by_user") {
      throw new Error("Transaction rejected.");
    }
    throw new Error(result?.error?.message ?? "Send failed.");
  }

  throw new Error(
    "Wallet not available in this client. Please update Base / Warpcast and try again.",
  );
}

// Regular Browser with Injected Wallet connected
if (!inMiniApp && providerDetails && connectedAddress) {
  const _provider = providerDetails.provider;
  const chainId = await _provider.request({ method: "eth_chainId" }).catch(() => null);
  if (chainId && chainId.toLowerCase() !== BASE_CHAIN_ID_HEX) {
    try {
      await _provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: BASE_CHAIN_ID_HEX }],
      });
    } catch {
      throw new Error("Please switch your wallet network to Base and try again.");
    }
  }

  const value = parseUnits(amount, 6);
  const data = encodeFunctionData({
    abi: ERC20_TRANSFER_ABI,
    functionName: "transfer",
    args: [RECIPIENT, value],
  });

  const dataWithBuilderCode = concatHex([data, DATA_SUFFIX as `0x${string}`]);

  const txHash = await _provider.request({
    method: "eth_sendTransaction",
    params: [{
      from: connectedAddress,
      to: BASE_USDC_ADDRESS,
      data: dataWithBuilderCode,
      value: "0x0"
    }],
  });
        
  if (!txHash || typeof txHash !== "string") throw new Error("Transaction failed.");
  setTxHash(txHash);
  setStatus("success");
  startTreeAnimation();
  return;
}

// Web fallback: Require wallet connection instead of silent checkout
if (!inMiniApp) {
  throw new Error("Please connect your wallet using the 'Connect Wallet' button first.");
}
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
          animation: sproutFade 3000ms ease-in-out both;
          will-change: transform, opacity;
          transform: translateZ(0);
        }
        @keyframes sproutFade {
          0% { transform: translateY(15px) scale(0.9); opacity: 0; }
          10% { opacity: 1; }
          85% { opacity: 1; transform: translateY(-5px) scale(1.05); box-shadow: 0 0 25px rgba(16,185,129,0.3); }
          100% { transform: translateY(-20px) scale(1.15); opacity: 0; }
        }

        .sprout-bounce {
          animation: sproutBounce 1200ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
          text-shadow: 0 0 15px rgba(16,185,129,0.6);
          will-change: transform;
          transform: translateZ(0);
        }
        @keyframes sproutBounce {
          0% { transform: translateY(15px) scale(0.8); opacity: 0; }
          50% { transform: translateY(-5px) scale(1.1); opacity: 1; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }

        .particle {
          position: absolute;
          width: 6px;
          height: 6px;
          border-radius: 999px;
          opacity: 0;
          box-shadow: 0 0 8px currentColor;
          animation: particleUp 2000ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
          will-change: transform, opacity;
        }
        @keyframes particleUp {
          0% { transform: translate3d(0, 0, 0) scale(0.5); opacity: 0; }
          20% { opacity: 1; transform: translate3d(calc(var(--x) * 0.3), calc(var(--y) * 0.3), 0) scale(1.2); }
          100% { transform: translate3d(var(--x), var(--y), 0) scale(0.2); opacity: 0; }
        }

        .p1 { left: 16px; top: 16px; --x: -25px; --y: -40px; animation-delay: 100ms; background: rgba(52,211,153,0.9); color: rgba(52,211,153,0.9); }
        .p2 { right: 16px; top: 18px; --x: 25px; --y: -35px; animation-delay: 200ms; background: rgba(16,185,129,0.9); color: rgba(16,185,129,0.9); }
        .p3 { left: 20px; bottom: 18px; --x: -20px; --y: 30px; animation-delay: 300ms; background: rgba(59,130,246,0.9); color: rgba(59,130,246,0.9); }
        .p4 { right: 22px; bottom: 16px; --x: 20px; --y: 35px; animation-delay: 400ms; background: rgba(139,92,246,0.9); color: rgba(139,92,246,0.9); }
        .p5 { left: 50%; top: 10px; --x: 0px; --y: -50px; animation-delay: 250ms; transform: translateX(-50%); background: rgba(236,72,153,0.9); color: rgba(236,72,153,0.9); }
      `}</style>
    </div>
  );
}
