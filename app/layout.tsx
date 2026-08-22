import type { Metadata, Viewport } from "next";
import "./globals.css";
import { WalletProvider } from "../components/WalletProvider";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#050509",
};

export const metadata: Metadata = {
  title: "Base Tree",
  description: "Plant real trees with USDC donations on Base",
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans">
        <WalletProvider>
          {children}
        </WalletProvider>
      </body>
    </html>
  );
}
