# Project Plan: OKX OnchainOS Credit

## Traceability
Requirements (PRD §4, §9) -> Epics (PRD §9) -> Stories (PRD §9) -> Tasks (below)

## Current Phase: Release Hardening on `main` (post-M6 completion)

Status note: Milestones M1-M6 were completed by March 10, 2026. Current work on `main` is release-readiness hardening, validation, and documentation sync.

## Milestones

---

### M1: Foundation & Infrastructure
**Status:** ✅ Completed (2026-03-09)
**Branch:** `milestone/m1`
**Worktree:** `../okx-onchainos-credit-M1`
**Covers:** Project scaffold, monorepo, OKX API client, DB schema, SIWE auth
**Depends on:** None

| Task ID | Story | Task | Done When | Status | Commit |
|---------|-------|------|-----------|--------|--------|
| M1-001 | — | Init bun workspaces (apps/web, packages/scoring, packages/mcp, packages/cli) | `bun install` at root installs all workspaces; each package.json has correct name + version | ✅ | `ae7d251` |
| M1-002 | — | Configure base TypeScript (root tsconfig + per-package extends) | `bun run type-check` passes at root; path aliases resolve correctly | ✅ | `ae7d251` |
| M1-003 | — | Setup Biome (lint + format) + pre-commit hook | `bun run lint` passes; `bun run lint:fix` auto-corrects; commit-msg hook validates format | ✅ | `a505dac` |
| M1-004 | E2-S01 | Scaffold OKX OnchainOS API client in packages/scoring | Client has typed methods: `getWalletHistory()`, `getDeFiPositions()`, `getTokenPrices()`; authenticated with OKX API key | ✅ | `03d265b` |
| M1-005 | — | Setup Turso + Drizzle (schema: credit_scores, audit_log) | `bun run db:push` creates tables; Drizzle client connects in Vercel env | ✅ | `d9113ce` |
| M1-006 | E1-S01 | WalletConnect integration (wagmi + viem in apps/web) | User can connect/disconnect any EVM wallet; wallet address available in React context | ✅ | `2c901dd` |
| M1-007 | E1-S02 | SIWE auth (sign-in/out route handlers + session cookie) | POST /api/auth/sign-in verifies SIWE signature; httpOnly session cookie set; GET /api/auth/session returns wallet | ✅ | `4717f83` |
| M1-008 | — | Setup Vitest + test infrastructure | `bun run test` runs; unit test for each scoring package export passes | ✅ | `f5fff54` |
| M1-009 | — | Setup Harness CLI (scripts/harness.ts + all sub-modules) | `bun run harness status` prints project status; `bun run harness validate` runs lint + type-check + test | ✅ | `52e4685` |
| M1-010 | — | GitHub Actions CI (lint + type-check + test on PR) | CI passes on main; red on lint/test failure | ✅ | `ea51110` |

---

### M2: Score Engine
**Status:** ✅ Completed (2026-03-10)
**Branch:** `milestone/m2`
**Worktree:** `../okx-onchainos-credit-M2`
**Covers:** E2 — all 5 scoring dimensions + aggregation + caching
**Depends on:** M1

| Task ID | Story | Task | Done When | Status | Commit |
|---------|-------|------|-----------|--------|--------|
| M2-001 | E2-S01 | Transaction data normalizer (OKX Wallet API -> typed events) | Raw OKX response normalized to `WalletEvent[]`; handles pagination; type-safe | ✅ | `2e2b602` |
| M2-002 | E2-S02 | Dimension: wallet age + activity frequency | `scoreWalletAge(events)` returns 0-100; unit tests cover new/old/inactive wallets | ✅ | `f58f506` |
| M2-003 | E2-S02 | Dimension: asset scale (OKX Market API portfolio valuation) | `scoreAssetScale(portfolio)` returns 0-100; uses historical prices for accuracy | ✅ | `f667233` |
| M2-004 | E2-S02 | Dimension: position stability (holding duration + volatility) | `scoreStability(positions)` returns 0-100; long-term HODLers score higher | ✅ | `0b24b58` |
| M2-005 | E2-S02 | Dimension: DeFi repayment history (OKX DeFi API) | `scoreRepayment(defiEvents)` returns 0-100; on-time repayments weighted; no history = 50 | ✅ | `4cf12bc` |
| M2-006 | E2-S02 | Dimension: multi-chain activity | `scoreMultichain(chainActivity)` returns 0-100; >5 chains = 100 | ✅ | `1581cfc` |
| M2-007 | E2-S03 | Score aggregation (5 dimensions -> 300-850 weighted) | `computeScore(wallet)` returns `{ score, dimensions, tier }`; matches PRD §8 formula | ✅ | `50fa463` |
| M2-008 | E2-S04 | Score caching (Turso, 24h TTL) | Cached score returned in < 100ms; stale score refreshed async; cache_hit logged | ✅ | `9fc20a0` |
| M2-009 | E2-S02 | Unit tests for all dimensions + aggregation | >= 90% coverage on `packages/scoring/src/dimensions/`; edge cases (empty wallet, whale, fresh wallet) | ✅ | `8cb0acb` |

---

### M3: x402 + Credential Issuance
**Status:** ✅ Completed (2026-03-10)
**Branch:** `milestone/m3`
**Worktree:** `../okx-onchainos-credit-M3`
**Covers:** E3 — x402 middleware, ECDSA signing, credential issuance endpoint
**Depends on:** M2

| Task ID | Story | Task | Done When | Status | Commit |
|---------|-------|------|-----------|--------|--------|
| M3-001 | E3-S01 | x402 middleware (HTTP 402 -> payment verification) | Requests without valid x402 payment header receive 402 with payment requirements; valid payments pass through | ✅ | `7a1012d` |
| M3-002 | E3-S02 | ECDSA signing service (env-based private key) | `signCredential(payload)` produces valid secp256k1 signature; key never logged or exposed | ✅ | `58031e2` |
| M3-003 | E3-S03 | Credential issuance endpoint (POST /api/credential) | x402 gated; returns signed credential JSON; 400 on invalid wallet; 402 on missing payment | ✅ | `2a86f02` |
| M3-004 | E3-S03 | Credential structure validation + expiry | Credential matches PRD §7 schema; expiresAt = issuedAt + 30 days | ✅ | `8b73749` |
| M3-005 | E3-S03 | Audit log on credential issuance | Each issuance writes to audit_log table (wallet_hash, x402_tx, score_tier, timestamp) | ✅ | `ded8703` |
| M3-006 | E3-S01 | Integration test (full x402 -> credential flow) | Test: valid payment -> 200 + credential; missing payment -> 402; invalid wallet -> 400 | ✅ | `8968495` |

---

### M4: Web Dashboard
**Status:** ✅ Completed (2026-03-10)
**Branch:** `milestone/m4`
**Worktree:** `../okx-onchainos-credit-M4`
**Covers:** E4 — landing page, score dashboard, credential flow, mobile responsive
**Depends on:** M3

| Task ID | Story | Task | Done When | Status | Commit |
|---------|-------|------|-----------|--------|--------|
| M4-001 | E4-S01 | Landing page (hero, features, CTA) | Loads in < 1s; WalletConnect button present; passes Lighthouse >= 90 | ✅ | `c277170` |
| M4-002 | E4-S01 | Wallet connect flow (connect -> SIWE -> redirect to dashboard) | Full flow works end-to-end; session cookie set; redirect on success | ✅ | `3de6367` |
| M4-003 | E4-S02 | Score gauge component (300-850 arc visualization) | Renders score as arc gauge; animates on load; accessible (aria-label with score) | ✅ | `8e4f2be` |
| M4-004 | E4-S02 | Score breakdown component (5 dimension bars + labels) | Each dimension shows 0-100 bar + label + current value; color-coded by tier | ✅ | `6a4c074` |
| M4-005 | E4-S02 | Improvement tips component (personalized, ranked by point gain) | Shows top 3 tips based on lowest dimensions; each tip has estimated point gain | ✅ | `6e6bd17` |
| M4-006 | E4-S03 | Credential issuance CTA + x402 payment flow | "Get Credential" button -> x402 payment -> loading state -> credential display + download | ✅ | `3feee4e` |
| M4-007 | E4-S04 | Mobile responsive layout (375px+) | Dashboard usable on mobile; no horizontal scroll; touch targets >= 44px | ✅ | `d179e35` |
| M4-008 | E4-S04 | Loading states + error states for all async operations | Every API call shows skeleton loader; errors show actionable message (not raw error) | ✅ | `3cee719` |

---

### M5: Enterprise API
**Status:** ✅ Completed (2026-03-10)
**Branch:** `milestone/m5`
**Worktree:** `../okx-onchainos-credit-M5`
**Covers:** E5 — enterprise x402 API, rate limiting, verification endpoint
**Depends on:** M3

| Task ID | Story | Task | Done When | Status | Commit |
|---------|-------|------|-----------|--------|--------|
| M5-001 | E5-S01 | GET /api/v1/score endpoint (x402 gated) | Returns score + breakdown + ECDSA signature; x402 verified; 400 on invalid wallet | ✅ | `c041356` |
| M5-002 | E5-S02 | GET /api/v1/credential/verify endpoint | Verifies ECDSA signature on submitted credential; returns { valid, wallet, score, expiresAt } | ✅ | `1c4ef13` |
| M5-003 | E5-S03 | Rate limiting (100 req/min per x402 payer) | Requests beyond limit receive 429; sliding window counter in Turso or KV | ✅ | `dc683db` |
| M5-004 | E5-S03 | API audit log (wallet_hash, payer, score_tier, timestamp) | Every enterprise API call writes audit_log entry; no raw wallet stored | ✅ | `8dcf45b` |
| M5-005 | E5-S01 | /api/health endpoint | Returns 200 with `{ status: "ok", version, uptime }`; used for uptime monitoring | ✅ | `2cee3cb` |

---

### M6: MCP Server + CLI
**Status:** ✅ Completed (2026-03-10)
**Branch:** `milestone/m6`
**Worktree:** `../okx-onchainos-credit-M6`
**Covers:** E6 — MCP server, SKILL.md, CLI, integration tests
**Depends on:** M4, M5

| Task ID | Story | Task | Done When | Status | Commit |
|---------|-------|------|-----------|--------|--------|
| M6-001 | E6-S01 | MCP server scaffold (stdio transport) | Server starts; responds to `initialize` request; `tools/list` returns 3 tools | ✅ | `91082d6` |
| M6-002 | E6-S01 | Tool: analyze_credit (wallet -> full credit analysis JSON) | Returns score + dimensions + tier + improvement tips; handles invalid wallet gracefully | ✅ | `c8aa11b` |
| M6-003 | E6-S01 | Tool: get_score (wallet -> score + breakdown only) | Returns score + 5 dimension scores; faster than analyze_credit | ✅ | `f82b4aa` |
| M6-004 | E6-S01 | Tool: get_improvement_tips (wallet -> ranked tips) | Returns top-N tips with point estimates; N configurable (default 3) | ✅ | `76b942b` |
| M6-005 | E6-S02 | SKILL.md + docs/api-reference.md | SKILL.md has tool names, schemas, connection method; api-reference.md has full JSON schemas | ✅ | `b7c6423` |
| M6-006 | E6-S03 | CLI: `okx-credit score <wallet>` | Returns score JSON or table; `--format json` for machine-readable; exit 0 on success | ✅ | `2b76fe4` |
| M6-007 | E6-S03 | CLI: `okx-credit verify <credential-json-path>` | Verifies ECDSA signature; prints valid/invalid + details; exit 0 if valid, exit 1 if invalid | ✅ | `eaf62c4` |
| M6-008 | E6-S04 | MCP integration tests (initialize -> tools/list -> tools/call -> error) | Full MCP lifecycle tested; structured error on bad input | ✅ | `af76be2` |
| M6-009 | E6-S04 | CLI unit tests | Tests cover: valid wallet, invalid wallet, JSON format, table format | ✅ | `26be05b` |

---

## Decision Log

| Date | Decision | Rationale | Alternatives Considered |
|------|----------|-----------|------------------------|
| 2026-03-09 | ECDSA-signed JSON for v1 credentials | Zero gas, fast to implement, upgradeable to EAS | EAS (v1.5 target), SBT, ZK proof |
| 2026-03-09 | OKX OnchainOS as sole data source | Full 60+ chain coverage, 1.2B+ daily API calls, no self-indexing | Build own indexer, use The Graph, Dune |
| 2026-03-09 | SIWE wallet-only auth | No account system needed; wallet IS identity | Privy, Dynamic, Clerk + wallet |
| 2026-03-09 | x402 for monetization | Agent-native, HTTP-native, instant micropayments | Stripe, manual invoicing, free tier |
| 2026-03-09 | Turso (libSQL) as database | Serverless, edge-compatible, simple schema, cheap | Supabase Postgres, PlanetScale, Neon |

## Known Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|------------|------------|
| OKX OnchainOS API rate limits | Score generation blocked | Medium | Implement request queue + exponential backoff; cache aggressively |
| OKX API coverage gaps (some chains) | Incomplete score for multichain users | Low-Medium | Flag data gaps in score breakdown; document supported chains |
| x402 SDK instability (early protocol) | Payment flow broken | Low | Pin x402 SDK version; test payment flow in CI against testnet |
| ECDSA private key compromise | All issued credentials untrustworthy | Low | Rotate key mechanism; revocation list for compromised credentials |
| Low OKX API wallet data for new wallets | Score always 300 (minimum) | Medium | Show clear "not enough history" message; provide wallet age requirement |
