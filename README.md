# OKX OnchainOS Credit

On-chain credit scoring platform. Uses OKX OnchainOS APIs (Wallet + DeFi + Market) to compute a **300–850 FICO-equivalent credit score** from wallet history across 60+ chains.

Retail users connect a wallet, authenticate with **SIWE**, and then unlock their score via **x402** (USDT0 on X Layer (Chain ID: 196)). After the paid score query settles, they can optionally mint an **ECDSA-signed verifiable credential**. DeFi protocols and agent infrastructure query scores through the same **pay-per-use API**. The MCP package remains preview/internal and is not part of the paid score path.

## Scoring Dimensions

| Dimension | Weight | Data Source |
|-----------|--------|-------------|
| Wallet Age + Activity | 20% | OKX Wallet API — transaction history |
| Asset Scale | 25% | OKX Market API — portfolio valuation |
| Position Stability | 20% | OKX Market API — holding duration + volatility |
| DeFi Repayment | 25% | OKX DeFi API — borrow/repay events |
| Multi-chain Activity | 10% | OKX Wallet API — 60+ chain coverage |

## Stack

- **Frontend + API**: Next.js (App Router) → Vercel
- **Database**: Turso (libSQL) + Drizzle ORM
- **Auth**: SIWE (Sign-In with Ethereum)
- **Payments**: x402 (OKX X Layer native, zero gas)
- **Data**: OKX OnchainOS APIs
- **Agent/API**: paid REST score API for protocol or agent callers
- **Agent tooling**: MCP Server (TypeScript, preview/internal)
- **CLI**: `okx-credit` (workspace CLI, preview/internal)
- **Monorepo**: bun workspaces

## Quick Start

```bash
bun install
cp .env.example .env  # fill in your keys
bun run db:push       # init Turso schema
bun run dev           # http://localhost:3000
```

## Production Notes

- `SIWE_SESSION_SECRET`, `ECDSA_PRIVATE_KEY`, and `ECDSA_PUBLIC_ADDRESS` are required for wallet auth, paid score unlock, and credential flows.
- Generate a local signer with `bun run credential:signer:create -- --write-env-file .env.local --include-siwe`.
- `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` are required in production. The local `file:local.db` fallback is development-only.
- `NEXT_PUBLIC_APP_URL` must be the exact HTTPS origin of the deployed app in preview and production.
- `LOCAL_INTEGRATION_MODE=mock` is development-only and now fails closed for release targets.
- x402 routes now verify receipt terms first and settle only after request validation and rate-limit checks pass.
- Release workflow:

```bash
bun run release:validate
bun run release:env:preview -- --env-file .env.vercel.preview.local
bun run release:env:production -- --env-file .env.vercel.production.local
bun run release:smoke -- --base-url https://<deployment-origin>
```

## Local Integration Mode

Fastest local web + API + credential loop:

```bash
bun install
cp .env.example .env

# Required even in local mock mode
# - SIWE_SESSION_SECRET
# - ECDSA_PRIVATE_KEY
# - ECDSA_PUBLIC_ADDRESS

bun run db:push
bun run dev
```

Notes:

- `LOCAL_INTEGRATION_MODE=mock` short-circuits live OKX score retrieval and x402 settlement.
- `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` can be left unset for local work; the app falls back to `file:local.db`.
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` can stay unset if you only use an injected browser wallet.
- In local mock mode, the dashboard pre-fills a demo x402 receipt so both paid score unlock and credential issuance can be exercised without the live payment network.

## Development

```bash
bun run harness init      # session start
bun run harness validate  # lint + type-check + test
bun run harness status    # current milestone + task
```

## Docs

- [`docs/PRD.md`](docs/PRD.md) — Product Requirements
- [`ARCHITECTURE.md`](ARCHITECTURE.md) — Technical blueprint
- [`docs/PLAN.md`](docs/PLAN.md) — Execution plan (6 milestones)
- [`docs/release-runbook.md`](docs/release-runbook.md) — Preview + production launch checklist
- [`docs/okx-api-reference.md`](docs/okx-api-reference.md) — OKX OnchainOS API reference
- [`AGENTS.md`](AGENTS.md) — Agent/Codex instructions
