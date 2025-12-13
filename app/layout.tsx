import type { Metadata } from "next";
import "./globals.css";

const APP_URL = "https://basetree.vercel.app";
const APP_NAME = "Base Tree";
const APP_DESCRIPTION =
  "View your Base/Farcaster profile details (FID, followers, Neynar score) and optionally help plant real trees onchain.";

// Put your Base Build app id here (from the “Verify & Add URL” modal)
const BASE_APP_ID = "693d425ed77c069a945bde51";

// NOTE: Embeds require a 3:2 image for imageUrl. Create /public/preview.png (e.g., 1200x800). 
const EMBED_IMAGE = `${APP_URL}/preview.png`;

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description: APP_DESCRIPTION,
  icons: {
    icon: "/favicon.png"
  },
  openGraph: {
    title: APP_NAME,
    description: APP_DESCRIPTION,
    url: APP_URL,
    images: [`${APP_URL}/hero.png`]
  },
  other: {
    // Base Build ownership verification
    "base:app_id": BASE_APP_ID,

    // Mini App embed metadata (needed for Base App rendering/sharing) 
    "fc:miniapp": JSON.stringify({
      version: "next",
      imageUrl: EMBED_IMAGE,
      button: {
        title: "Open Base Tree",
        action: {
          type: "launch_frame",
          url: APP_URL,
          name: APP_NAME,
          splashImageUrl: `${APP_URL}/splash.png`,
          splashBackgroundColor: "#050509"
        }
      }
    })
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
