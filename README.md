# Base Tree

Base Tree is a Base mini app and web app for planting trees with USDC donations on Base.

**Live app:** https://basetree.rakibhq.xyz

---

## Overview

Base Tree combines a lightweight environmental impact card with an onchain donation flow. Inside a Farcaster or Base mini app client, it reads basic user identity directly from the mini app SDK. On the web, it shows an anonymous environmental impact view while still allowing wallet-based donations.

The donation flow lets users send USDC on Base to a tree-planting donation address and view the transaction receipt on Basescan after payment.

## Features

- Farcaster identity from the current mini app context
- Environmental impact status and Base network details
- Anonymous web fallback when mini app context is unavailable
- USDC donation presets for `$0.10`, `$0.50`, `$1.00`, and custom amounts
- Base mainnet wallet flow with automatic network switching request
- Mini app donation support through Farcaster wallet capabilities
- Browser wallet support through injected EIP-6963 providers
- Transaction receipt link to Basescan after a successful donation
- ERC-8021 transaction attribution with a Base Builder Code
- Tree growth animation after payment confirmation
- Farcaster/Base mini app metadata and static preview assets

## Supported network

- Base Mainnet

## Identity behavior

When the app runs inside a Farcaster-compatible mini app client, it reads the current user's FID, username, display name, and profile image directly from the mini app SDK context.

The UI shows:

- Farcaster username and display name
- Profile image when available
- FID
- Environmental impact status

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
- ox
- viem

---

## License

This project is licensed under the [MIT License](./LICENSE).
