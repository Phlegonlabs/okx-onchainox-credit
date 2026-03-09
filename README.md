# OKX OnchainOS Credit

On-chain credit scoring platform. Uses OKX OnchainOS APIs (Wallet + DeFi + Market) to compute a **300–850 FICO-equivalent credit score** from wallet history across 60+ chains.

Retail users pay via **x402** (USDC on X Layer (Chain ID: 196)) to receive an **ECDSA-signed verifiable credential**. DeFi protocols query scores through a **pay-per-use enterprise API**. AI agents interact via **MCP server** (OpenClaw Skill).

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
- **Agent**: MCP Server (TypeScript)
- **CLI**: `okx-credit` (bun binary)
- **Monorepo**: bun workspaces

## Quick Start

```bash
bun install
cp .env.example .env  # fill in your keys
bun run db:push       # init Turso schema
bun run dev           # http://localhost:3000
```

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
- [`docs/okx-api-reference.md`](docs/okx-api-reference.md) — OKX OnchainOS API reference
- [`AGENTS.md`](AGENTS.md) — Agent/Codex instructions
