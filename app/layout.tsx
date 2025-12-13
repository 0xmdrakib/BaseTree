import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Reputation Lens",
  description:
    "Minimal Farcaster / Base mini app that visualizes your Neynar user score and social graph at a glance.",
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
