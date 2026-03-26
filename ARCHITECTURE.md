# Architecture: Graxis

## Domain Map

```
┌─────────────────────────────────────────────────────────────────┐
│                      OKX OnchainOS APIs                         │
│          Wallet API │ DeFi API │ Market API (60+ chains)        │
└────────────────────────┬────────────────────────────────────────┘
                         │
              ┌──────────▼──────────┐
              │   packages/scoring   │  Score Engine
              │  (isolated package)  │  5-dimension algorithm
              └──────────┬──────────┘
                         │
     ┌───────────────────┼───────────────────┐
     │                   │                   │
┌────▼─────┐    ┌────────▼───────┐   ┌──────▼──────┐
│ apps/web │    │ packages/mcp   │   │packages/cli  │
│ Next.js  │    │ MCP Server     │   │ Developer CLI│
│ UI + API │    │ OpenClaw Skill │   │ bun binary   │
└────┬─────┘    └────────────────┘   └─────────────┘
     │
     ├── Turso (libSQL) — score cache + audit log
     ├── x402 middleware — payment verification
     ├── ECDSA signing service — credential issuance
     └── SIWE auth — wallet session management
```

---

## Dependency Layers

Strict ordering — each layer can only import from layers to its left:

```
Types → Config → Lib → API Clients → Services → Controllers/Handlers → UI
```

**Concrete for this project today:**
```
packages/scoring/src/types.ts
  → packages/scoring/src/lib/*.ts               (OKX client, parsers, wallet data loaders)
  → packages/scoring/src/dimensions/*.ts        (dimension scorers)
  → packages/scoring/src/scorer.ts              (300–850 aggregation)
  → packages/scoring/src/analysis.ts            (analysis text + tips)

apps/web/src/lib/env.ts
  → apps/web/src/lib/session.ts + auth/*.ts     (SIWE challenge + session cookies)
  → apps/web/src/lib/x402/*.ts                  (verify/settle helpers)
  → apps/web/src/lib/credit/*.ts                (cache + score orchestration)
  → apps/web/src/app/api/**/route.ts            (Next.js route handlers)
  → apps/web/src/app/*.tsx + components/**      (pages and UI)
```

**Current automated checks:**
- `bun run lint`
- `bun run type-check`
- `bun run test`
- `bun run test:integration`
- `bun run build`
- `bun run harness file-guard`

The package boundaries below are architectural intent. This repo does not currently have a dedicated import-boundary linter beyond TypeScript/Biome.

---

## Package / Module Structure

```
graxis/
├── apps/web/                        # Next.js App Router frontend + API
│   ├── src/app/
│   │   ├── page.tsx                 # Marketing landing page
│   │   ├── dashboard/               # Authenticated dashboard
│   │   └── api/
│   │       ├── auth/nonce           # One-time SIWE challenge route
│   │       ├── auth/sign-in         # SIWE sign-in + session cookie
│   │       ├── auth/sign-out        # Session teardown
│   │       ├── auth/session         # Session inspection
│   │       ├── credential           # Retail x402 credential issuance
│   │       ├── health               # Health check
│   │       └── v1/                  # Enterprise x402 API
│   ├── src/components/
│   │   ├── dashboard/               # Score, breakdown, credential panels
│   │   ├── marketing/               # Landing page sections
│   │   ├── navigation/              # Header and sign-out controls
│   │   └── wallet/                  # Wallet connect + provider
│   └── src/lib/
│       ├── auth/                    # SIWE message + nonce helpers
│       ├── credit/                  # Cache, score loading, dashboard shaping
│       ├── credential/              # Payloads, signing, verification, audit
│       ├── db/                      # Lazy libSQL client + schema
│       ├── enterprise/              # Rate limit, audit, enterprise payloads
│       ├── wallet/                  # Wallet formatting, chain config, hashing
│       └── x402/                    # Verify + settle helpers for OKX payments
│
├── packages/scoring/                # Shared scoring and analysis engine
│   └── src/
│       ├── analysis.ts
│       ├── credential.ts
│       ├── dimensions/
│       ├── lib/
│       ├── scorer.ts
│       ├── types.ts
│       └── wallet-score.ts
│
├── packages/mcp/                    # MCP server (preview/internal)
│   └── src/{server,tools,lib}.ts
│
├── packages/cli/                    # CLI (preview/internal)
│   └── src/{commands,lib,program,index}.ts
│
├── scripts/
│   ├── harness.ts                   # Harness CLI entry point
│   ├── check-commit-msg.ts          # Commit message validator
│   ├── release/                     # Release preflight + smoke scripts
│   └── harness/                     # Harness CLI modules
│       ├── config.ts
│       ├── types.ts
│       ├── state.ts
│       ├── plan-utils.ts
│       ├── recovery.ts
│       ├── worktree-helpers.ts
│       ├── worktree.ts
│       ├── task-helpers.ts
│       ├── tasks.ts
│       ├── validate.ts
│       ├── quality.ts
│       ├── plan-apply.ts
│       └── scaffold-templates.ts
│
├── docs/
│   ├── PRD.md
│   ├── PLAN.md
│   ├── progress.json                # Cross-session agent state (lives in docs/ for visibility)
│   ├── frontend-design.md           # Frontend design skill (bundled for Claude Code / Codex)
│   ├── learnings.md                 # Accumulated agent learnings
│   ├── exec-plans/
│   │   ├── active/                  # Current plan files (unmerged milestones)
│   │   └── completed/               # Archived plan files
│   └── memory/
│       └── MEMORY.md                # Long-term project memory for agent sessions
│
├── schemas/
│   └── progress.schema.json         # JSON Schema for progress.json validation
│
├── AGENTS.md                        # Agent instructions (same as CLAUDE.md)
├── CLAUDE.md                        # Agent instructions (same as AGENTS.md)
├── ARCHITECTURE.md                  # This file
├── SKILL.md                         # MCP server discovery (run: bun run harness scaffold skill)
├── package.json                     # bun workspace root
├── tsconfig.json                    # Base TypeScript config
├── biome.json                       # Linting + formatting
├── .env.example                     # Env var template
├── .gitignore
└── .github/
    └── workflows/
        └── ci.yml                   # Lint + type-check + test on PR
```

---

## Error Handling Pattern

All application errors extend `AppError` from `apps/web/src/lib/errors.ts`:

```typescript
class AppError extends Error {
  constructor(
    message: string,
    public code: string,           // Machine-readable: 'SCORE_COMPUTE_FAILED'
    public statusCode: number,     // HTTP status
    public details?: unknown       // Optional structured context
  )
}
```

Route handlers return structured JSON errors directly:
`{ error: { code: string, message: string, details? } }`

MCP tools return structured MCP errors — never raw exceptions.

---

## Logging Pattern

Use `logger` from `apps/web/src/lib/logger.ts` (pino). Never `console.log` in production.

Every log entry includes:
- `requestId` — injected by middleware
- `walletHash` — SHA256 of wallet address (privacy-preserving)
- `operation` — e.g., `score.compute`, `credential.issue`, `api.query`
- `durationMs` — for performance monitoring
- `level` — debug (dev only), info (business events), warn (recoverable), error (failures)

---

## x402 Payment Flow

```
Client                    Next.js API Route           OKX x402 APIs
  │                             │                          │
  │── GET /api/v1/score ────────▶│                          │
  │◀────────────────────────────│ 402 + paymentRequired    │
  │                             │                          │
  │── retry + Payment-Signature ▶│── verify(receipt) ─────▶│
  │                             │◀──────────── verified ───│
  │                             │── local term checks      │
  │                             │── settle(receipt) ──────▶│
  │                             │◀──────────── settled ────│
  │◀─────────────── score JSON ─│
```

x402 helpers live in `apps/web/src/lib/x402/`. Routes now validate request input first, verify receipt terms, and settle only after cheap rejects and rate limiting pass.
Payments accepted: USDC/USDT/USDG on X Layer (Chain ID: 196, zero gas). OKX's own x402 API — NOT the Coinbase @coinbase/x402 package.
Prices: Retail credential = $0.50; Enterprise score query = $0.10.

---

## ECDSA Credential Structure

```json
{
  "version": "1.0",
  "issuer": "graxis",
  "wallet": "0xABCD...",
  "score": 720,
  "tier": "good",
  "dimensions": {
    "walletAge": 78,
    "assetScale": 65,
    "positionStability": 71,
    "repaymentHistory": 82,
    "multichain": 55
  },
  "issuedAt": 1709000000,
  "expiresAt": 1711600000,
  "signature": "0x..."
}
```

Signing: secp256k1 via `ethers.Wallet.signMessage(JSON.stringify(payload))`.
Verification: `ethers.verifyMessage(payload, signature) === ISSUER_PUBLIC_ADDRESS`.

---

## Deploy Architecture

- **Target:** Vercel (Next.js managed)
- **Method:** Git push auto-deploy (main → production, branches → preview)
- **Build:** `bun run build` → `.next/`
- **CI/CD:** GitHub Actions (lint + type-check + test on PR) + Vercel auto-deploy on merge
- **Environment:** Vercel dashboard env vars (production + preview)
- **Database:** Turso (serverless libSQL, accessed via `@libsql/client`)
- **Release preflight:** `bun run release:env:preview|production` validates env snapshots before deploy
- **Release smoke:** `bun run release:smoke -- --base-url <origin>` checks public routes after deploy
- **Runtime guard:** release requests fail closed if `NEXT_PUBLIC_APP_URL` is missing/invalid, `LOCAL_INTEGRATION_MODE=mock` leaks into production, or Turso env is missing
- **Health:** `/api/health` → 200 with uptime + version
- **Preview:** Vercel preview deployments per PR branch
- **Runbook:** `docs/release-runbook.md`

---

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Scoring data source | OKX OnchainOS only | Full 60+ chain coverage, 1.2B+ daily API calls, no self-indexing needed |
| Credential format | ECDSA-signed JSON (v1), EAS (v1.5) | Zero gas, immediate protocol compatibility, upgradeable path |
| Auth | SIWE only | No account system needed; wallet IS the identity |
| Payment | x402 (OKX X Layer native) | Agent-native, HTTP-native, no wallet UX for enterprise API calls |
| Database | Turso (libSQL) | Serverless, edge-compatible, cheap, schema-simple (no complex joins) |
| Monorepo | bun workspaces | shared scoring engine across web + MCP + CLI |

ADRs: `docs/design-docs/` (created as needed)
