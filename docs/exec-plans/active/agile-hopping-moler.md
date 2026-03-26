# Graxis -- Full Project Review

## Context

This is a comprehensive review of the entire codebase at the request of the project owner.
The project has completed all 6 milestones (M1-M6) and is in post-release state on `main`.

---

## Project Overview

| Metric | Value |
|--------|-------|
| Source files (non-test) | 124 |
| Test files | 53 |
| Total TypeScript lines | ~16,600 |
| Workspaces | 4 (`apps/web`, `packages/scoring`, `packages/mcp`, `packages/cli`) |
| Milestones | 6/6 completed |
| Runtime | Bun 1.3.10 |
| Deploy target | Vercel (Next.js) + Turso (libSQL) |

---

## Architecture Assessment: A

Strict layered dependency model is well-enforced:

```
Types -> Config -> Lib -> API Clients -> Services -> Controllers -> UI
```

- `packages/scoring` has zero imports from `apps/web` -- clean boundary
- `packages/mcp` and `packages/cli` depend only on `packages/scoring` -- correct
- No circular dependencies detected
- Server/client boundary in Next.js is clean (no `"use server"` actions, all explicit API routes)

---

## Scoring Algorithm: A

Fully matches PRD specification:
- Formula: `score = 300 + (weightedSum / 100) * 550`, clamped [300, 850]
- 5 dimensions with correct weights (walletAge 20%, assetScale 25%, stability 20%, repayment 25%, multichain 10%)
- Tier brackets: excellent (750-850), good (650-749), fair (500-649), poor (300-499)
- DeFi protocol coverage: Aave V2/V3, Compound V3, Morpho Blue, Spark across multiple chains
- New wallet handling: neutral 50 defaults, "insufficient history" for <30 days
- EVM-only enforcement with correct chain set

---

## Security: A-

**Strong:**
- SIWE auth with HMAC-SHA256 signed nonces, DB-backed replay protection, `timingSafeEqual`
- ECDSA credentials with deterministic JSON serialization, 30-day expiry enforcement
- x402 payment two-phase flow (verify + settle) with HMAC-signed OKX API requests
- Wallet privacy: SHA-256 hashing, no raw transaction storage, audit logs use `scoreTier` not raw score
- httpOnly/sameSite cookies, domain/origin verification, configurable session expiry
- `.env.example` has no real secrets, `.env` in `.gitignore`
- Local mock mode blocked in production via `isLocalMode()` check

**Gap:**
- **EIP-55 checksum not enforced at MCP/CLI entry points** -- PRD NFR-012 requires checksummed addresses, but `isValidEvmWallet()` in both `packages/mcp` and `packages/cli` uses regex only (`/^0x[a-fA-F0-9]{40}$/`). The scoring package does use `ethers.getAddress()` internally, but invalid checksums pass the input gate.

---

## Test Quality: A-

53 test files covering all core business logic. Key strengths:
- Credential tests cover tampering, wrong signer, valid signatures (10 test cases)
- OKX client tests cover pagination, HMAC signing, retry on 429/5xx, timeout budget (8 cases)
- DeFi parser tests cover failed tx, pending tx, unknown contracts, protocol matching (17 cases)
- MCP integration tests use real InMemoryTransport for full client/server lifecycle
- Test setup properly restores `process.env` between tests (no env leakage)
- Dependency injection throughout enables fast, isolated tests

**Gaps:**
- No dedicated unit tests for `improvement-tips.ts`, `wallet-data.ts`, `okx-request-retry.ts`
- CLI has only 1 test file (5 cases) -- no tests for `score-output.ts` formatting individually
- No tests for `estimateHistoricalBalanceUsd()` edge cases (single candle, all-zero closes)

---

## Code Quality: A

- All source files under 500-line limit (harness enforced)
- Biome linting with strict rules (`noConsole: error`, `noUnusedVariables: error`)
- Consistent error hierarchy (`AppError` base class with typed subclasses)
- Structured logging via pino with context objects (no `console.log`)
- Clean barrel exports from each package
- DI pattern used consistently across all three packages

---

## x402 Payment System: A

Complete custom implementation:
- OKX x402 REST API integration (not Coinbase SDK)
- EIP-712 typed data construction for `TransferWithAuthorization`
- Retry with exponential backoff for transient errors
- Token metadata for 4 payment tokens (USDC, USDG, USDT, USDT0)
- Two price tiers: $0.50 credential, $0.10 score query
- X Layer (Chain ID 196) for zero-gas payments

---

## Frontend: B+

- Dark-mode-only Vercel-inspired design with custom CSS variables
- Animated SVG score gauge with `requestAnimationFrame` needle animation
- SSE streaming for real-time score job progress (25s window, 1s tick)
- Proper loading skeleton (`DashboardLoadingShell`) and error boundary
- OKX wallet integration with extension + OKX Connect fallback
- Responsive Tailwind layout with breakpoints

**Observations:**
- Shadcn UI configured (`components.json`) but no shadcn components actually used -- all custom Tailwind
- No `not-found.tsx` page
- No Next.js middleware -- route protection is inline (works but less DRY)
- `DashboardSessionCard` component appears unused by current pages

---

## Database: A

5-table schema with clean design:
- `credit_scores` -- score cache with `stale` flag and TTL
- `score_jobs` -- async job state machine with optimistic locking (`lockToken`)
- `audit_log` -- credential/API audit trail
- `api_rate_limits` -- sliding window rate limiting (100 req/60s)
- `siwe_nonce_uses` -- replay protection with 24h retention

Query patterns are well-implemented:
- Upsert for score caching (insert + onConflictDoUpdate)
- Transactional nonce consumption with unique constraint
- Sliding window rate limiting in single transaction

---

## CI/CD: B+

- GitHub Actions CI on push/PR to main with concurrency cancellation
- `validate:ci` = lint + type-check + test + file-guard
- Bun `--frozen-lockfile` ensures reproducible installs
- Husky commit-msg hook for format enforcement
- Release scripts: `release:validate`, `release:env:preview/production`, `release:smoke`

**Missing:**
- No staging/preview environment validation in CI
- No integration test run in CI (only unit tests)
- No build step in CI pipeline (though `release:validate` includes it)

---

## Harness CLI: A

Well-structured agent orchestration tool (165-line entry, 15 sub-modules):
- Task state machine: start -> done/block -> next
- Worktree management for milestone isolation
- Plan apply/status for exec plan workflows
- Quality gates: merge-gate, stale-check, file-guard
- Scaffold templates for MCP, skills, tests
- Recovery command for state repair

---

## Issues Found (Priority Order)

### P1 -- Should Fix

1. **EIP-55 checksum not enforced at entry points**
   - `packages/mcp/src/lib/tool-results.ts:38` and `packages/cli/src/lib/wallet.ts:1`
   - Both use regex-only validation, violating PRD NFR-012
   - Fix: use `ethers.isAddress()` + `ethers.getAddress()` or equivalent

2. **Duplicate `isValidEvmWallet()` function**
   - Identical implementation in MCP and CLI packages
   - Should be exported from `@graxis/scoring` to prevent drift

### P2 -- Nice to Have

3. **No `not-found.tsx`** -- returns generic Next.js 404 instead of branded page

4. **Unused `DashboardSessionCard` component** -- dead code in `src/components/dashboard/`

5. **Shadcn UI config with no shadcn components** -- `components.json` exists but nothing uses it; minor config clutter

6. **No build step in CI** -- `validate:ci` runs lint + type-check + test but not `next build`, so broken builds could merge

7. **No integration tests in CI** -- `test:integration` is defined but not part of `validate:ci`

### P3 -- Observations

8. **Dynamic imports in `scorer.ts`** -- all 5 dimension modules use `await import()` which adds async overhead with no tree-shaking benefit in Node/Bun

9. **Missing unit tests** for `improvement-tips.ts`, `wallet-data.ts`, `okx-request-retry.ts`, `score-output.ts`

10. **`multichain.ts` unreachable fallback** -- line 30 returns `10` but this code path can never be reached since `chainCount >= 1` always matches `CHAIN_SCORE_MAP[1]`

---

## Summary

This is a well-architected, production-quality codebase. The scoring algorithm faithfully implements the PRD, the security model is thorough (SIWE + ECDSA + x402 + wallet privacy), test coverage is strong across core business logic, and the code follows consistent patterns (DI, error hierarchy, structured logging). The main actionable items are EIP-55 enforcement at MCP/CLI entry points and adding the build step to CI.
