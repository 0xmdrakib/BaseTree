import type { Metadata } from "next";
import "./globals.css";

const APP_URL = "https://basetree.vercel.app";
const BASE_APP_ID = "693d425ed77c069a945bde51"; // from Base Build modal

export const metadata: Metadata = {
  title: "Base Tree",
  description: "View Base profile details and plant real trees onchain",
  other: {
    "base:app_id": BASE_APP_ID,

    // Required for Base app embed rendering on the homeUrl page 
    "fc:miniapp": JSON.stringify({
      version: "next",
      imageUrl: `${APP_URL}/preview.png`, // must be 3:2 aspect ratio 
      button: {
        title: "Open Base Tree",
        action: {
          type: "launch_frame",
          url: APP_URL
        }
      }
    })
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
