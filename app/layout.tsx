import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Reputation Lens",
  description:
    "Minimal Farcaster / Base mini app that visualizes your Neynar user score and social graph at a glance.",
  other: {
    "base:app_id": "693add74e6be54f5ed71d645", // <- your real app id from Base
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans">{children}</body>
    </html>
  );
}
