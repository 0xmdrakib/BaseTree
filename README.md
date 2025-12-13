base profile checker mini apps

# Reputation Lens – Farcaster / Base Mini App

A minimal, professional Farcaster / Base mini app that:

- Detects the viewer's **FID** and **username** from the Mini App context.
- Uses **Neynar** to fetch:
  - Neynar **user score** (0–1)
  - `follower_count`
  - `following_count`
- Renders a clean reputation card UI, optimized for mobile in-app usage.

## 1. Prerequisites

- Node.js 18+ (LTS recommended)
- Your **Neynar API key**

## 2. Setup

Install dependencies:

```bash
npm install
```

Create a `.env.local` file in the project root:

```bash
NEYNAR_API_KEY=your_neynar_api_key_here
# Optional, defaults to https://api.neynar.com
# NEYNAR_API_URL=https://api.neynar.com
```

Start the dev server:

```bash
npm run dev
```

The app will be available at `http://localhost:3000`.

## 3. How it works

- The frontend is a **Next.js App Router** page (`app/page.tsx`).
- It uses `@farcaster/miniapp-sdk`:
  - `isInMiniApp()` to check if it's running inside a Farcaster / Base mini app.
  - `sdk.context` to read the Mini App context and detect the current user.
  - `sdk.actions.ready()` to hide the built–in splash screen once UI is ready.

- Once it has the viewer's **FID**, it calls:

  ```text
  GET /api/profile?fid=<fid>
  ```

- The API route (`app/api/profile/route.ts`) then calls Neynar:

  ```text
  GET /v2/farcaster/user/bulk?fids=<fid>
  ```

  with headers:

  - `x-api-key: <your-key>`
  - `x-neynar-experimental: true` (to include `neynar_user_score` in `experimental`).

- The response is trimmed to just:

  - `fid`
  - `username`
  - `displayName`
  - `pfpUrl`
  - `followerCount`
  - `followingCount`
  - `neynarScore` (0–1 or `null`)

and rendered in a single reputation card.

## 4. Mini App manifest (farcaster.json)

Per Farcaster Mini Apps and Base docs, your app needs a **manifest** at:

```text
/.well-known/farcaster.json
```

This project already includes a starter manifest at:

```text
public/.well-known/farcaster.json
```

Update it with your real domain and assets:

```json
{
  "miniapp": {
    "version": "1",
    "name": "Reputation Lens",
    "iconUrl": "https://your-domain.example/icon.png",
    "homeUrl": "https://your-domain.example/",
    "imageUrl": "https://your-domain.example/og-image.png",
    "buttonTitle": "Open profile",
    "splashImageUrl": "https://your-domain.example/icon.png",
    "splashBackgroundColor": "#050509"
  }
}
```

Once deployed, this should be reachable at:

```text
https://your-domain.example/.well-known/farcaster.json
```

Later, you can use the official **Mini App Manifest Tool** to sign this manifest
and add the `accountAssociation` block.

## 5. Deploying and registering

1. Deploy this Next.js app (for example, on Vercel).
2. Ensure `/.well-known/farcaster.json` is served correctly.
3. In Base App / other Farcaster clients, follow the Mini App publishing docs to
   register your domain as a Mini App.

After publishing, users will be able to:

- Open the app from Base / Warpcast.
- Automatically see **their own** reputation card pulled from Neynar.

## 6. Files overview

- `app/page.tsx` – main UI and Mini App integration.
- `app/api/profile/route.ts` – Neynar proxy API (server-side, hides your key).
- `app/layout.tsx` & `app/globals.css` – global styling and base layout.
- `tailwind.config.ts` & `postcss.config.mjs` – TailwindCSS configuration.
- `public/.well-known/farcaster.json` – Mini App manifest (edit this for production).

## 7. Notes

- Neynar user score is between **0 and 1**, updated weekly.
- This project does **not** log or store user data. It just fetches and displays
  the live profile for the active viewer.
