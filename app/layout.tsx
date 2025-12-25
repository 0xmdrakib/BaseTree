import type { Metadata } from "next";
import "./globals.css";

const APP_URL = "https://basetree.vercel.app";
const BASE_APP_ID = "693d425ed77c069a945bde51"; // from Base Build modal

const MINIAPP_EMBED = {
  version: "1",
  imageUrl: `${APP_URL}/embed.png`, // 3:2
  button: {
    title: "Open Base Tree",
    action: {
      type: "launch_miniapp",
      name: "Base Tree",
      url: APP_URL,
      splashImageUrl: `${APP_URL}/splash.png`,
      splashBackgroundColor: "#050509"
    }
  }
};

const FRAME_EMBED = {
  ...MINIAPP_EMBED,
  button: {
    ...MINIAPP_EMBED.button,
    action: {
      ...MINIAPP_EMBED.button.action,
      type: "launch_frame"
    }
  }
};

export const metadata: Metadata = {
  title: "Base Tree",
  description: "View Base profile details and plant real trees onchain",
  other: {
    // Base App ownership / embedding
    "base:app_id": BASE_APP_ID,

    // Farcaster discovery embeds (required for Farcaster clients)
    "fc:miniapp": JSON.stringify(MINIAPP_EMBED),
    // Backward compatibility
    "fc:frame": JSON.stringify(FRAME_EMBED)
  }
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans">{children}</body>
    </html>
  );
}
