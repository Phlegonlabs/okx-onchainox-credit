# Project Learnings

> Accumulated insights from development sessions. Agents: add entries here via `bun run harness learn <category> "<insight>"`.

## Architecture

- OKX OnchainOS already has MCP servers for Trade AI and Market AI. Consider calling these upstream from our MCP server in M6 instead of duplicating REST API calls.
- OKX x402 uses stablecoins (USDG/USDT/USDC) on X Layer (Chain ID: 196), NOT OKT. OKX has its own API endpoints (`/api/v6/wallet/payments/*`) — do NOT use `@coinbase/x402`. Zero gas on X Layer. Token addresses in `.env.example`.
- Non-EVM chains (Solana, TON, Sui, TRON) are all supported by OKX Wallet API — multi-chain scoring dimension can be genuinely comprehensive.

## OKX API

- Transaction History API uses cursor-based pagination. Always handle pagination in the data normalizer.
- Token Information API has `top-holder` data — useful for asset quality scoring (holding tokens where you're a top holder vs. small retail holder signals different behavior).
- WebSocket Market Data available for real-time price feeds — evaluate for real-time score cache invalidation in v2.

## x402

- x402 flow: server → HTTP 402 + payment params → client pays ERC-20 (USDC/USDT/USDG on X Layer) → client calls `/verify` → retries with `Payment-Signature` → server calls `/settle` → returns result. OKX handles settlement; zero gas on X Layer.
- Price discovery: $0.50 for retail credential, $0.10 for enterprise score query. Adjust based on market feedback.

## Scoring Algorithm

- New wallets (< 30 days) should return a "not enough history" message rather than a 300 score, to avoid discouraging new users.
- DeFi repayment dimension: if no DeFi history found, default to neutral (50/100), not zero — absence of bad behavior is not negative.

## Dependencies

- `@libsql/client` is the Turso client for bun/Node.js environments.
- Drizzle ORM with `drizzle-kit` for migrations. Use `bun run db:push` for dev, migrations for prod.
- `viem` + `wagmi` v2 for WalletConnect. Use `@web3modal/wagmi` or `RainbowKit` for the connect button UI.
- `ethers` v6 for ECDSA signing (server-side only — `ethers.Wallet.signMessage()`).
- `siwe` npm package for Sign-In with Ethereum message parsing and verification.
- OKX x402 is implemented via their own REST API (`/api/v6/wallet/payments/supported|verify|settle`), not the `@coinbase/x402` npm package. Build a custom `x402.ts` client against these endpoints.
- `pino` for structured logging in Next.js (compatible with Vercel's log drain).
