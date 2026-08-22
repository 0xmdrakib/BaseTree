"use client";

import { useState, useRef, useEffect } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import { useWallet } from "./WalletProvider";

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function WalletIcon({ className = "h-[18px] w-[18px]" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M21 12.75V9a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 1 3 4.5v13.125A2.375 2.375 0 0 0 5.375 20h13.25A2.375 2.375 0 0 0 21 17.625V16.5" />
      <path d="M3 4.5A2.5 2.5 0 0 1 5.5 2H18a1 1 0 0 1 1 1v3.75" />
      <path d="M21 12h-4.25a2.25 2.25 0 0 0 0 4.5H21V12Z" />
      <circle cx="16.75" cy="14.25" r="0.75" fill="currentColor" stroke="none" />
    </svg>
  );
}

export default function WalletConnect() {
  const {
    address: webAddress,
    availableWallets,
    connectWallet,
    connectWalletConnect,
    disconnectWallet,
  } = useWallet();
  const [isOpen, setIsOpen] = useState(false);
  const [walletConnectError, setWalletConnectError] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const [miniappAddress, setMiniappAddress] = useState<string | null>(null);
  const [isMiniappMode, setIsMiniappMode] = useState(false);
  const [showMiniappConnected, setShowMiniappConnected] = useState(false);

  useEffect(() => {
    sdk.isInMiniApp().then(async (isIn) => {
      if (isIn) {
        try {
          const context = await sdk.context;
          if (context?.user?.fid) {
            setIsMiniappMode(true);
            setShowMiniappConnected(true);
            const provider: any = await sdk.wallet.getEthereumProvider();
            const accounts: string[] = await provider.request({ method: "eth_accounts" });
            if (accounts && accounts.length > 0) {
              setMiniappAddress(accounts[0]);
            } else {
              setMiniappAddress("0xBase...App");
            }
          }
        } catch (e) {
          // Not farcaster or failed
        }
      }
    }).catch(() => {});
  }, []);

  const effectiveAddress = (isMiniappMode && showMiniappConnected) ? (miniappAddress || "0xBase...App") : webAddress;

  const handleDisconnect = () => {
    if (isMiniappMode && showMiniappConnected) {
      setShowMiniappConnected(false);
    } else {
      disconnectWallet();
    }
  };

  const handleConnectClick = () => {
    if (isMiniappMode) {
      setShowMiniappConnected(true);
    } else {
      setIsOpen(true);
    }
  };

  // Close modal when clicked outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const openWalletConnect = async () => {
    setWalletConnectError(null);

    try {
      await connectWalletConnect();
      setIsOpen(false);
    } catch (error: any) {
      setWalletConnectError(error?.message ?? "WalletConnect connection failed.");
    }
  };

  if (effectiveAddress) {
    return (
      <div className="absolute right-4 -top-14 z-30">
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 py-1.5 shadow-lg backdrop-blur-md transition hover:bg-black/50">
          <span className="relative flex h-6 w-6 items-center justify-center rounded-lg bg-white/10 text-white/90">
            <WalletIcon className="h-4 w-4" />
            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border border-black bg-green-400" />
          </span>
          <span className="text-xs font-semibold text-white/90">
            {shortAddr(effectiveAddress)}
          </span>
          <button
            onClick={handleDisconnect}
            className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-white/60 hover:bg-white/20 hover:text-white"
            title="Disconnect"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-3 w-3"
            >
              <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
              <line x1="12" y1="2" x2="12" y2="12" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute right-4 -top-14 z-30">
      <button
        onClick={handleConnectClick}
        className="inline-flex items-center gap-2.5 rounded-full border border-white/20 bg-black/40 py-1.5 pl-1.5 pr-4 text-xs font-semibold text-white shadow-lg backdrop-blur-md transition hover:border-white/30 hover:bg-black/60 focus:outline-none focus:ring-2 focus:ring-white/20"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-inset ring-white/10">
          <WalletIcon />
        </span>
        Connect Wallet
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div
            ref={modalRef}
            className="relative w-full max-w-sm rounded-3xl border border-white/10 bg-gradient-to-b from-[#111115] to-black p-5 shadow-2xl backdrop-blur-2xl"
          >
            {/* Soft background glow */}
            <div className="pointer-events-none absolute inset-0 -z-10 rounded-3xl opacity-40 blur-2xl flex justify-center">
               <div className="h-32 w-32 bg-emerald-500/20 rounded-full" />
            </div>

            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Connect Wallet</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-full p-1.5 text-white/50 hover:bg-white/10 hover:text-white"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-5 w-5"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <p className="mt-1 text-xs text-white/50">
              Select an injected wallet to use inside your browser.
            </p>

            <div className="mt-5 space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
              {availableWallets.length === 0 ? (
                <div className="py-4 text-center text-sm text-white/40">
                  No injected wallets found. Please install a wallet extension like MetaMask.
                </div>
              ) : (
                availableWallets.map((wallet) => (
                  <button
                    key={wallet.info.rdns}
                    onClick={() => {
                      connectWallet(wallet.info.rdns);
                      setIsOpen(false);
                    }}
                    className="flex w-full items-center justify-between rounded-2xl border border-white/5 bg-white/5 p-3 transition hover:border-white/15 hover:bg-white/10"
                  >
                    <span className="text-sm font-semibold text-white/90">
                      {wallet.info.name}
                    </span>
                    {typeof wallet.info.icon === 'string' ? (
                       <img
                         src={wallet.info.icon}
                         alt={wallet.info.name}
                         className="h-8 w-8 rounded-lg object-contain"
                       />
                    ) : (
                      <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center">
                         <span className="text-[10px] text-white/50">W</span>
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>

            <div className="mt-4 border-t border-white/10 pt-4">
              <button
                type="button"
                onClick={openWalletConnect}
                className="flex w-full items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white/90 transition hover:border-[#3396ff]/45 hover:bg-[#3396ff]/10"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#3396ff]">
                  <svg viewBox="0 0 32 32" className="h-5 w-5" aria-hidden="true">
                    <path
                      d="M8.1 12.2c4.4-4.3 11.5-4.3 15.8 0l.6.6a.7.7 0 0 1 0 1l-2 1.9a.35.35 0 0 1-.5 0l-.8-.8a7.5 7.5 0 0 0-10.5 0l-.9.8a.35.35 0 0 1-.5 0l-2-1.9a.7.7 0 0 1 0-1l.8-.6Zm20 4 1.8 1.8a.7.7 0 0 1 0 1l-8.1 7.9a.7.7 0 0 1-1 0L15 21.3a.18.18 0 0 0-.25 0L9 26.9a.7.7 0 0 1-1 0L0 19a.7.7 0 0 1 0-1l1.9-1.8a.7.7 0 0 1 1 0l5.7 5.6a.18.18 0 0 0 .25 0l5.7-5.6a.7.7 0 0 1 1 0l5.7 5.6a.18.18 0 0 0 .25 0l5.7-5.6a.7.7 0 0 1 .9 0Z"
                      fill="white"
                    />
                  </svg>
                </span>
                WalletConnect
              </button>
              {walletConnectError && (
                <p className="mt-3 text-center text-xs text-red-300">
                  {walletConnectError}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
      
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
}
