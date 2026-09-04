import type { Metadata, Viewport } from "next";
import "./globals.css";
import { WalletProvider } from "../components/WalletProvider";

const BASE_APP_ID = "693d425ed77c069a945bde51";
const SITE_URL = "https://basetree.rakibhq.xyz";
const SITE_TITLE = "Base Tree";
const SITE_DESCRIPTION = "Plant real trees with USDC donations on Base";
const EMBED_IMAGE = "/basetree-embed.png";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#050509",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: SITE_TITLE,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: EMBED_IMAGE,
        width: 1200,
        height: 630,
        alt: "Base Tree — Plant real trees with USDC on Base",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [EMBED_IMAGE],
  },
  other: {
    "base:app_id": BASE_APP_ID,
  },
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
