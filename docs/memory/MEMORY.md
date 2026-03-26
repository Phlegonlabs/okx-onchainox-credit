# Project Memory — Graxis

> Long-term agent memory. Update via `bun run harness learn <category> "<insight>"`.
> Session logs: docs/memory/YYYY-MM-DD.md

## Stack
- Monorepo: bun workspaces (apps/web, packages/scoring, packages/mcp, packages/cli)
- Frontend + API: Next.js App Router → Vercel auto-deploy
- Database: Turso (libSQL) + Drizzle ORM
- Auth: SIWE (Sign-In with Ethereum) — wallet-only, no account system
- Payments: x402 (OKX X Layer native) — USDC/USDT/USDG on X Layer; zero gas on X Layer (Chain ID: 196)
- Credentials: ECDSA-signed JSON (v1) → EAS attestation (v1.5)
- Linting: Biome (replaces ESLint + Prettier)

## OKX OnchainOS APIs (verified 2026-03-09, all /api/v6/)
- Auth: 4 headers — OK-ACCESS-KEY/TIMESTAMP/PASSPHRASE/SIGN; sign=Base64(HMAC-SHA256(ts+METHOD+path+body, secret))
- Balance:    GET /api/v6/dex/balance/total-value-by-address  (params: address, chains)
              GET /api/v6/dex/balance/all-token-balances-by-address
- Tx History: GET /api/v6/dex/post-transaction/transactions-by-address (cursor pagination, max 100/page)
- Price:      POST /api/v6/dex/market/price
- Candles:    GET /api/v6/dex/market/candles (OHLCV)
- Top Holder: GET /api/v6/dex/market/token/top-holder
- NO dedicated DeFi lending API — detect borrow/repay by filtering tx methodId (see okx-api-reference.md §7)
- x402: OKX OWN endpoints (/api/v6/wallet/payments/supported|verify|settle), NOT @coinbase/x402; current app default is USDT0 on X Layer (chainId 196), with other supported stablecoins available by env config
- OKX has MCP servers for Trade AI + Market AI — call upstream in M6
- chains param = comma-separated chainIndex: 1=ETH, 42161=ARB, 10=OP, 8453=BASE, 196=XLayer, 56=BSC, 137=MATIC

## Scoring Algorithm
- 5 dimensions: walletAge(20%) + assetScale(25%) + stability(20%) + repayment(25%) + multichain(10%)
- Formula: score = 300 + (weightedSum / 100) × 550
- Tiers: excellent(750+), good(650+), fair(500+), poor(300+)
- No DeFi history → repayment defaults to 50 (neutral, not zero)
- New wallet (< 30 days) → show "not enough history" message, not score 300

## Privacy Rules
- Never store raw transaction data in DB
- Log walletHash (SHA256) not wallet address
- Audit log stores score_tier, not raw score

## Key Files
- `docs/PRD.md` — requirements, scoring algorithm, data model
- `ARCHITECTURE.md` — module structure, dependency layers, x402 flow
- `docs/PLAN.md` — 6 milestones, 47 tasks
- `docs/okx-api-reference.md` — OKX API endpoints reference
- `docs/learnings.md` — implementation learnings
- `packages/scoring/src/types.ts` — all scoring interfaces
- `packages/scoring/src/scorer.ts` — aggregation formula

## Workflow
- Start every session: `bun run harness init`
- Validate before commit: `bun run harness validate`
- Worktree per milestone: `bun run harness worktree:start M1`
- Plans directory: `docs/exec-plans/active/`
