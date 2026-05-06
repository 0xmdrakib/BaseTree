# Base Tree

Base Tree is a Base mini app and web app for viewing Farcaster profile reputation and planting trees with USDC donations on Base.

**Live app:** https://basetree.vercel.app

---

## Overview

Base Tree combines a lightweight profile card with an onchain donation flow.

Inside a Farcaster or Base mini app client, it reads the connected user context, fetches profile details from Neynar, and shows follower stats, follow ratio, and Neynar reputation score. On web, it falls back to an anonymous environmental impact view while still allowing wallet-based donations.

The donation flow lets users send USDC on Base to a tree-planting donation address and view the transaction receipt on Basescan after payment.

## Features

- Farcaster profile lookup using the current mini app user FID
- Neynar score, follower count, following count, and follow ratio display
- Reputation label based on Neynar score ranges
- Anonymous web fallback when mini app context is unavailable
- USDC donation presets for `$0.10`, `$0.50`, `$1.00`, and custom amounts
- Base mainnet wallet flow with automatic network switching request
- Mini app donation support through Farcaster wallet capabilities
- Browser wallet support through injected EIP-6963 providers
- Transaction receipt link to Basescan after a successful donation
- Tree growth animation after payment confirmation
- Share button that opens the Farcaster cast composer from supported clients
- Farcaster/Base mini app metadata and static preview assets

## Supported network

- Base Mainnet

## Profile behavior

When the app runs inside a Farcaster-compatible mini app client, it checks the mini app SDK context for the current user FID. The server API route uses that FID to request the user's Farcaster profile data from Neynar.

The UI shows:

- Farcaster username and display name
- Profile image when available
- FID
- Follower and following counts
- Follow ratio
- Neynar score
- Human-readable signal label

If profile data is unavailable or the app is opened as a regular web app, Base Tree shows an anonymous environmental impact profile instead of blocking the experience.

## Donation behavior

Base Tree sends USDC donations on Base Mainnet.

The donation card supports fixed and custom USDC amounts. In supported mini app clients, it first tries to use the Farcaster wallet provider for a direct transaction confirmation. If that capability is not available, it falls back to the mini app token send action when supported.

In regular browsers, users can connect an injected wallet, switch to Base if needed, and send the USDC transfer from their connected address.

## Tech stack

- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- Farcaster Mini App SDK
- Base Account SDK
- viem
- Neynar API

---

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a `.env` file in the project root. Then copy the values from [.env.example](./.env.example) and fill them in.

```env
NEYNAR_API_KEY=your_neynar_api_key
```

### 3. Run the development server

```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

### 4. Build for production

```bash
npm run build
npm run start
```

## License

This project is licensed under the [MIT License](./LICENSE).
