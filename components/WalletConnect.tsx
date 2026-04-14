"use client";

import { useState, useRef, useEffect } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import { useWallet } from "./WalletProvider";

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default function WalletConnect() {
  const { address: webAddress, availableWallets, connectWallet, disconnectWallet } = useWallet();
  const [isOpen, setIsOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  const [miniappAddress, setMiniappAddress] = useState<string | null>(null);
  const [isMiniappMode, setIsMiniappMode] = useState(false);
  const [showMiniappConnected, setShowMiniappConnected] = useState(false);

  useEffect(() => {
    sdk.isInMiniApp().then((isIn) => {
      setIsMiniappMode(isIn);
      if (isIn) {
        setShowMiniappConnected(true);
        sdk.wallet.getEthereumProvider().then((provider: any) => {
           provider.request({ method: "eth_accounts" }).then((accounts: string[]) => {
               if (accounts && accounts.length > 0) {
                 setMiniappAddress(accounts[0]);
               } else {
                 setMiniappAddress("0xBase...App");
               }
           }).catch(() => setMiniappAddress("0xBase...App"));
        }).catch(() => setMiniappAddress("0xBase...App"));
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

  if (effectiveAddress) {
    return (
      <div className="absolute left-4 -top-12 z-30">
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 py-1.5 shadow-lg backdrop-blur-md transition hover:bg-black/50">
          <div className="h-2 w-2 rounded-full bg-green-400" />
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
    <div className="absolute left-4 -top-12 z-30">
      <button
        onClick={handleConnectClick}
        className="rounded-full border border-white/20 bg-black/40 px-4 py-2 text-xs font-semibold text-white shadow-lg backdrop-blur-md transition hover:border-white/30 hover:bg-black/60 focus:outline-none focus:ring-2 focus:ring-white/20"
      >
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
                    key={wallet.info.uuid}
                    onClick={() => {
                      connectWallet(wallet.info.uuid);
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
