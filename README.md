# Base Tree

Base Tree is a web app for planting trees with USDC donations on Base.

**Live app:** https://basetree.rakibhq.xyz

---

## Overview

Base Tree combines a lightweight environmental impact card with an onchain donation flow. Users connect a browser wallet or WalletConnect-compatible wallet to donate USDC on Base.

The donation flow lets users send USDC on Base to a tree-planting donation address and view the transaction receipt on Basescan after payment.

## Features

- Environmental impact status and Base network details
- Anonymous environmental impact profile
- USDC donation presets for `$0.10`, `$0.50`, `$1.00`, and custom amounts
- Base mainnet wallet flow with automatic network switching request
- Browser wallet support through injected EIP-6963 providers
- Mobile wallet support through WalletConnect
- Transaction receipt link to Basescan after a successful donation
- Optional ERC-8021 transaction attribution configured through an environment variable
- Tree growth animation after payment confirmation

## Supported network

- Base Mainnet

## Donation behavior

Base Tree sends USDC donations on Base Mainnet.

The donation card supports fixed and custom USDC amounts. Users can connect an injected browser wallet or use WalletConnect, switch to Base when needed, and send the USDC transfer from their connected address.

## Tech stack

- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- WalletConnect Ethereum Provider
- ox
- viem

---

## License

This project is licensed under the [MIT License](./LICENSE).
