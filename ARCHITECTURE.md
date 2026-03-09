# Architecture: OKX OnchainOS Credit

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

**Concrete for this project:**
```
packages/scoring/src/types.ts
  → packages/scoring/src/config.ts
  → packages/scoring/src/lib/okx-client.ts      (OKX OnchainOS API client)
  → packages/scoring/src/services/scorer.ts      (scoring algorithm)

apps/web/src/lib/                                (errors, logger, env)
  → apps/web/src/lib/okx.ts                      (re-exports scoring package)
  → apps/web/src/lib/x402.ts                     (x402 middleware)
  → apps/web/src/lib/ecdsa.ts                    (credential signing)
  → apps/web/src/lib/siwe.ts                     (auth service)
  → apps/web/src/api/                            (Next.js route handlers)
  → apps/web/src/app/                            (Next.js pages/components)
```

**Import rules (enforced by ESLint):**
- `apps/web/src/app/` — may NOT import from `api/` directly; use server actions or API routes
- `packages/scoring` — may NOT import from `apps/web` or other app packages
- `packages/mcp` — imports from `packages/scoring` only; no direct DB access
- `packages/cli` — imports from `packages/scoring` only; no direct DB access
- No circular imports between packages

---

## Package / Module Structure

```
okx-onchainos-credit/
├── apps/
│   └── web/                         # Next.js App Router (frontend + API)
│       ├── src/
│       │   ├── app/                 # Pages, layouts, server components
│       │   │   ├── (marketing)/     # Landing page (unauthenticated)
│       │   │   ├── dashboard/       # Score dashboard (wallet-gated)
│       │   │   └── api/             # Next.js route handlers
│       │   │       ├── auth/        # SIWE sign-in/out/session
│       │   │       ├── score/       # Score generation endpoint
│       │   │       ├── credential/  # x402 → ECDSA credential issuance
│       │   │       └── v1/          # Enterprise API (x402 gated)
│       │   ├── components/          # Reusable UI components
│       │   │   ├── score/           # ScoreGauge, ScoreBreakdown, ImprovementTips
│       │   │   ├── wallet/          # WalletConnect, SIWEButton, WalletBadge
│       │   │   └── ui/              # Design system primitives
│       │   ├── lib/                 # Shared app utilities
│       │   │   ├── errors.ts        # AppError hierarchy
│       │   │   ├── logger.ts        # Structured JSON logger (pino)
│       │   │   ├── env.ts           # Env validation (t3-env or zod)
│       │   │   ├── x402.ts          # x402 payment middleware
│       │   │   ├── ecdsa.ts         # ECDSA signing + verification
│       │   │   ├── siwe.ts          # SIWE session management
│       │   │   └── db.ts            # Drizzle + Turso client
│       │   ├── modules/
│       │   │   ├── auth/            # SIWE auth domain
│       │   │   ├── credit/          # Credit score domain (uses scoring package)
│       │   │   └── credential/      # Credential issuance domain
│       │   └── middleware.ts        # Next.js middleware (auth guard)
│       ├── public/
│       ├── package.json
│       ├── next.config.ts
│       └── tsconfig.json
│
├── packages/
│   ├── scoring/                     # Credit score engine (framework-agnostic)
│   │   └── src/
│   │       ├── types.ts             # Score, Dimension, RawWalletData interfaces
│   │       ├── config.ts            # Scoring weights, brackets, constants
│   │       ├── lib/
│   │       │   └── okx-client.ts    # OKX OnchainOS API client (Wallet/DeFi/Market)
│   │       ├── dimensions/
│   │       │   ├── wallet-age.ts    # Wallet age + activity dimension
│   │       │   ├── asset-scale.ts   # Portfolio value dimension
│   │       │   ├── stability.ts     # Position stability dimension
│   │       │   ├── repayment.ts     # DeFi repayment history dimension
│   │       │   └── multichain.ts    # Multi-chain activity dimension
│   │       ├── scorer.ts            # Aggregation: 5 dimensions → 300-850
│   │       └── index.ts             # Public API: computeScore(), getDimensions()
│   │
│   ├── mcp/                         # MCP Server (OpenClaw Skill)
│   │   └── src/
│   │       ├── tools/
│   │       │   ├── analyze-credit.ts
│   │       │   ├── get-score.ts
│   │       │   └── get-improvement-tips.ts
│   │       ├── lib/
│   │       │   └── credit-client.ts  # Calls scoring package
│   │       └── server.ts             # MCP server entry (stdio transport)
│   │
│   └── cli/                         # Developer CLI
│       └── src/
│           ├── commands/
│           │   ├── score.ts          # okx-credit score <wallet>
│           │   ├── verify.ts         # okx-credit verify <credential>
│           │   └── report.ts         # okx-credit report <wallet> [--format json]
│           ├── lib/
│           │   └── output.ts         # Table/JSON/plain formatters
│           └── index.ts              # Commander entry point
│
├── scripts/
│   ├── harness.ts                   # Harness CLI entry point
│   ├── check-commit-msg.ts          # Commit message validator
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

HTTP layer catches via global error middleware in `apps/web/src/middleware.ts`.
Response shape: `{ error: { code: string, message: string, details? } }`

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
Client                    Next.js API Route           x402 Verifier
  │                             │                          │
  │── GET /api/v1/score ────────▶│                          │
  │                             │── 402 Payment Required ──▶│
  │◀────────────────────────────│ {paymentRequired: {...}} │
  │                             │                          │
  │── GET /api/v1/score ────────▶│                          │
  │   Payment-Signature: <sig>  │── verify(sig, req) ──────▶│
  │                             │◀─────────────── valid ───│
  │◀─────────────── score JSON ─│                          │
```

x402 middleware lives in `apps/web/src/lib/x402.ts`. Uses OKX OnchainOS x402 native support.
Payments accepted: USDC/USDT/USDG on X Layer (Chain ID: 196, zero gas). OKX's own x402 API — NOT the Coinbase @coinbase/x402 package.
Prices: Retail credential = $0.50; Enterprise score query = $0.10.

---

## ECDSA Credential Structure

```json
{
  "version": "1.0",
  "issuer": "okx-onchainos-credit",
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
- **Config file:** `vercel.json` (env var mapping, function timeouts)
- **Environment:** Vercel dashboard env vars (production + preview)
- **Database:** Turso (serverless libSQL, accessed via `@libsql/client`)
- **Health:** `/api/health` → 200 with uptime + version
- **Preview:** Vercel preview deployments per PR branch

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
