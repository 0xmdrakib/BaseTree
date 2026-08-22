"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";

// EIP-6963 types
interface EIP6963ProviderInfo {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
}

interface EIP6963ProviderDetail {
  info: EIP6963ProviderInfo;
  provider: any;
}

interface EIP6963AnnounceProviderEvent extends CustomEvent {
  type: "eip6963:announceProvider";
  detail: EIP6963ProviderDetail;
}

interface WalletContextType {
  address: string | null;
  providerDetails: EIP6963ProviderDetail | null; // active provider
  availableWallets: EIP6963ProviderDetail[];
  connectWallet: (rdns: string) => Promise<void>;
  connectWalletConnect: () => Promise<void>;
  disconnectWallet: () => void;
}

const WalletContext = createContext<WalletContextType | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [providerDetails, setProviderDetails] = useState<EIP6963ProviderDetail | null>(null);
  const [availableWallets, setAvailableWallets] = useState<Map<string, EIP6963ProviderDetail>>(new Map());
  const walletConnectProvider = useRef<any>(null);

  // Listen for EIP-6963 provider announcements
  useEffect(() => {
    function onAnnounceProvider(event: EIP6963AnnounceProviderEvent) {
      setAvailableWallets((prevMap) => {
        const newMap = new Map(prevMap);
        newMap.set(event.detail.info.rdns, event.detail);
        return newMap;
      });
    }

    // Add event listener
    window.addEventListener("eip6963:announceProvider", onAnnounceProvider as EventListener);

    // Dispatch event to request providers already injected
    window.dispatchEvent(new Event("eip6963:requestProvider"));

    return () => {
      window.removeEventListener("eip6963:announceProvider", onAnnounceProvider as EventListener);
    };
  }, []);

  // Sync with standard window.ethereum fallback if no EIP6963 was found after a brief time
  useEffect(() => {
    const timer = setTimeout(() => {
      setAvailableWallets((prevMap) => {
        if (prevMap.size === 0 && (window as any).ethereum) {
          const newMap = new Map(prevMap);
          // Add a generic fallback provider wrapper
          newMap.set("io.metamask.fallback", {
            info: {
              uuid: "fallback",
              name: "Injected Wallet",
              icon: `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M21 12V7H5a2 2 0 0 1 0-4h14v4'/><path d='M3 5v14a2 2 0 0 0 2 2h16v-5'/><path d='M18 12a2 2 0 0 0 0 4h4v-4Z'/></svg>`,
              rdns: "io.metamask.fallback",
            },
            provider: (window as any).ethereum,
          });
          return newMap;
        }
        return prevMap;
      });
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // Set up event listeners for active provider account changes
  useEffect(() => {
    if (!providerDetails) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnectWallet();
      } else {
        setAddress(accounts[0]);
      }
    };

    const handleDisconnect = () => {
      setAddress(null);
      setProviderDetails(null);
      localStorage.removeItem("connected_wallet_rdns");
    };

    const provider: any = providerDetails.provider;
    if (provider?.on) {
      provider.on("accountsChanged", handleAccountsChanged);
      provider.on("disconnect", handleDisconnect);
    }

    return () => {
      if (provider?.removeListener) {
        provider.removeListener("accountsChanged", handleAccountsChanged);
        provider.removeListener("disconnect", handleDisconnect);
      }
    };
  }, [providerDetails]);

  // Restore connection on mount
  useEffect(() => {
    const savedRdns = localStorage.getItem("connected_wallet_rdns");
    if (!savedRdns || address) return;

    const selected = availableWallets.get(savedRdns);
    if (!selected) return;

    selected.provider.request({ method: "eth_accounts" })
      .then((accounts: string[]) => {
          if (accounts && accounts.length > 0) {
            setAddress(accounts[0]);
            setProviderDetails(selected);
          }
      })
      .catch(() => {});
  }, [availableWallets, address]);

  const connectWallet = async (rdns: string) => {
    const selected = availableWallets.get(rdns);
    if (!selected) {
      alert("Wallet extension not found.");
      return;
    }

    try {
      // Ensure we request accounts and base chain logic, actually, DonateTreeCard handles chain switching.
      // We just need to prompt standard connect.
      const accounts: string[] = await selected.provider.request({
        method: "eth_requestAccounts",
      }) ?? [];

      if (accounts.length > 0) {
        setAddress(accounts[0]);
        setProviderDetails(selected);
        localStorage.setItem("connected_wallet_rdns", rdns);
      }
    } catch (e: any) {
      console.error("Wallet connection cancelled or failed:", e);
      // Removed the ugly alert(e?.message) so users don't see native popups when rejecting
    }
  };

  const connectWalletConnect = async () => {
    const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?.trim();
    if (!projectId) {
      throw new Error("WalletConnect is not configured.");
    }

    const { EthereumProvider } = await import("@walletconnect/ethereum-provider");
    const provider = await EthereumProvider.init({
      projectId,
      chains: [8453],
      showQrModal: true,
      qrModalOptions: {
        themeMode: "dark",
        enableExplorer: true,
        enableMobileFullScreen: false,
        themeVariables: {
          "--wcm-z-index": "100",
          "--wcm-font-family": "Inter, ui-sans-serif, system-ui, sans-serif",
          "--wcm-container-border-radius": "28px",
        },
      },
      rpcMap: {
        8453: new URL("/api/base-rpc", window.location.origin).toString(),
      },
      metadata: {
        name: "Base Tree",
        description: "Plant trees with USDC on Base.",
        url: window.location.origin,
        icons: [new URL("/icon.png", window.location.origin).toString()],
      },
    });

    walletConnectProvider.current = provider;

    if (!provider.connected) {
      await provider.connect();
    }

    const accounts = await provider.request<string[]>({ method: "eth_accounts" });
    const account = accounts?.[0];
    if (!account) throw new Error("WalletConnect did not return an account.");

    const details: EIP6963ProviderDetail = {
      info: {
        uuid: "walletconnect",
        name: provider.session?.peer.metadata.name ?? "WalletConnect",
        icon: provider.session?.peer.metadata.icons?.[0] ?? "",
        rdns: "org.walletconnect",
      },
      provider,
    };

    setAddress(account);
    setProviderDetails(details);
    localStorage.setItem("connected_wallet_rdns", details.info.rdns);
  };

  const disconnectWallet = () => {
    if (providerDetails?.info.rdns === "org.walletconnect") {
      void walletConnectProvider.current?.disconnect().catch(() => {});
      walletConnectProvider.current = null;
    }
    setAddress(null);
    setProviderDetails(null);
    localStorage.removeItem("connected_wallet_rdns");
  };

  return (
    <WalletContext.Provider
      value={{
        address,
        providerDetails,
        availableWallets: Array.from(availableWallets.values()),
        connectWallet,
        connectWalletConnect,
        disconnectWallet,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
};
