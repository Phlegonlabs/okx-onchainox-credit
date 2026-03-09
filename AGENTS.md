# OKX OnchainOS Credit — Agent Instructions

## Project Overview

On-chain credit scoring platform. Uses OKX OnchainOS APIs (Wallet + DeFi + Market) to compute a 300–850 FICO-equivalent credit score from wallet history. Retail users pay via x402 (USDC on X Layer (Chain ID: 196)) to receive an ECDSA-signed verifiable credential. DeFi protocols query scores via x402 enterprise API. AI agents interact via MCP server (OpenClaw Skill).

**Stack:** bun workspaces · Next.js (App Router) on Vercel · Turso (libSQL) + Drizzle · SIWE auth · x402 payments · TypeScript throughout

**Repo map:**
- `docs/PRD.md` — full product requirements + scoring algorithm
- `ARCHITECTURE.md` — domain map, module structure, dependency layers, data flows
- `docs/PLAN.md` — milestones, tasks, done-when criteria
- `docs/progress.json` — cross-session agent state
- `docs/learnings.md` — accumulated learnings (read before starting)
- `docs/frontend-design.md` — frontend design system (MUST READ before any UI work)
- `docs/memory/` — daily session logs

## Quick Start

```bash
bun install                     # install all workspaces
bun run harness init            # session boot — do this first, every time
bun run harness validate        # lint:fix → lint → type-check → test
bun run dev                     # start Next.js dev server (apps/web)
bun run db:push                 # push Drizzle schema to Turso
```

## Session Init — Do This First, Every Time

```bash
bun run harness init
```

Then load memory:
- Read `docs/memory/MEMORY.md` — long-term project memory
- Read `docs/memory/YYYY-MM-DD.md` (today + yesterday) — recent session context

After init, proceed DIRECTLY to writing code. Do not wait for user confirmation.

## Task Execution Loop

```bash
bun run harness init          # once per session

# repeat:
  # write code for current task
  bun run harness validate
  git add -A && git commit -m "[M1-003] what you did"
  bun run harness done M1-003  # auto-cascades to next task
```

If validate fails 3×: `bun run harness block M1-003 "reason"` → auto-advances to next task.

## Plan Files

All plan files MUST be written to `docs/exec-plans/active/`.

For Claude Code: handled automatically via `.claude/settings.json` (plansDirectory).
For Codex: write plans to `docs/exec-plans/active/YYYY-MM-DD-description.md`.

### Adding New Work
1. Enter plan mode (Shift+Tab) → discuss requirements
2. Run: `bun run harness plan:status` — shows current state
3. Write plan to `docs/exec-plans/active/`
4. Run: `bun run harness init` — CLI detects + applies plan

## Git Workflow — Worktree per Milestone

```bash
# From main repo root:
bun run harness worktree:start M1   # create worktree → install → init → start M1-001

# All work in worktree. On milestone completion:
bun run harness done M1-010         # auto: merge-gate → worktree:finish → worktree:start M2
```

Commit format: `[M<n>-<task_id>] <what changed>`

## Scaffold Templates

```bash
bun run harness scaffold mcp          # MCP server files
bun run harness scaffold skill        # SKILL.md at root
bun run harness scaffold agent-test   # MCP integration tests
bun run harness scaffold milestone:agent  # Agent milestone in PLAN.md
```

---

## Iron Rules — Non-Negotiable

### 1. 500-Line Hard Ceiling + Proactive Modularization
No single **source code file** may exceed 500 lines. But don't wait until 500 — split
proactively. If a file is approaching ~250 lines and has more than one responsibility,
extract a module NOW. Every file should have a single, clear purpose.

**Proactive split triggers (act on ANY of these):**
- File has 2+ unrelated sections → extract to separate modules
- File has functions used by multiple other files → move to a shared module
- A single function exceeds ~80 lines → extract helpers or decompose
- You're adding a new feature to an existing file and it'll push past ~300 lines → new module
- A component renders AND fetches data AND handles state → split by concern
- The harness CLI itself follows this rule: entry point ~50 lines, 6 focused modules, each <350 lines

**How to decompose:**
- Group by domain/responsibility, not by file type (don't put all types in one file)
- Each module exports a clear, minimal API — internal helpers stay private
- Prefer deep module trees (modules/auth/service.ts, modules/auth/routes.ts) over flat ones
- Re-export from index.ts barrel files when the module API is stable

**Documentation files are exempt from the 500-line limit.** These files may
(and often will) exceed 500 lines — do NOT split them:
- `docs/PRD.md` — grows with the project
- `docs/PLAN.md` — grows with each sprint
- `AGENTS.md` / `CLAUDE.md` — must stay in one file (agents read them whole)
- `ARCHITECTURE.md`, `docs/site/*.md`, `docs/learnings.md`, any file under `docs/`

If `PLAN.md` grows past ~1000 lines, archive completed execution plan files to
`docs/exec-plans/completed/` rather than splitting the file. The CLI handles this
automatically via `worktree:finish` when a milestone completes.

### 2. Zero Compatibility Code
No polyfills. No shims. No backward-compat wrappers.
Write for the target runtime and version in project config. Period.
If a dependency requires compat hacks, replace the dependency.

### 3. Conflict = Delete and Rebuild
If a module conflicts with existing code — type mismatches, circular deps, API surface
disagreements — do NOT patch around it. Delete and rebuild from scratch.
Code is cheap. Tokens are infinite. Architectural clarity is priceless.

### 4. First Principles Programming
Every function, module, and abstraction must justify its existence from first principles.
Ask: What is this actually trying to do? What is the simplest correct way?
If you can't explain the WHY in one sentence, the code shouldn't exist.

### 5. Frontend = Always Use frontend-design Skill
When generating any frontend code (components, pages, layouts, styles), ALWAYS read
and follow `docs/frontend-design.md` first. This file is bundled in the project.
No exceptions. Even for "small" UI changes.

### 6. Secrets Never Touch Git
.env files are NEVER committed. Not even "example" values that look like real keys.
- `.env` is in .gitignore from day zero — non-negotiable
- `.env.example` contains only KEY_NAME=placeholder pairs, never real values
- All secrets load from environment variables at runtime, never hardcoded
- If you see a string that looks like a key/token/password in source code, extract it to env immediately

### 7. Production Ready Standard
Every milestone must be shippable. Code that "works on my machine" is not done.
- Error handling: every external call (API, DB, file I/O) has try/catch or error boundary
- Input validation: every endpoint/command validates input before processing
- Logging: every error is logged with context (request ID, user, operation)
- No console.log in production code — use structured logger
- No hardcoded URLs, ports, or credentials — all from env/config
- No TODO/FIXME/HACK comments — if it's not fixed, it's a task in PLAN.md
- Tests cover the happy path AND at least one error path per function
- Build produces zero warnings (not just zero errors)
- README/docs accurately describe what the code actually does right now

---

## Architecture Rules

**Dependency layers (strict — violations fail lint):**
```
Types → Config → Lib → API Clients → Services → Controllers → UI
```

**Critical import rules:**
- `packages/scoring` — imports OKX SDK only; NO imports from apps/web or other packages
- `packages/mcp` — imports from `packages/scoring` only; no direct DB access
- `packages/cli` — imports from `packages/scoring` only; no direct DB access
- `apps/web/src/app/` — may NOT import from `api/` directly; use server actions or API routes
- No circular imports between packages (checked by `bun run harness validate`)

**Wallet data privacy:**
- Never store raw transaction data in DB — only computed scores + metadata
- Log wallet_hash (SHA256) not wallet address in logs
- Audit log stores score_tier, not raw score

## Error Handling

All app errors extend `AppError` from `apps/web/src/lib/errors.ts`.
HTTP responses: `{ error: { code: "MACHINE_READABLE", message: "Human readable", details? } }`
MCP tools: return structured MCP errors — NEVER raw exceptions.

## Logging

Use `logger` from `apps/web/src/lib/logger.ts` (pino). Never `console.log` in production.
Every log: `{ requestId, walletHash, operation, durationMs, level }`.

## x402 Payment Rule

EVERY endpoint that returns score or credential data MUST go through x402 middleware first.
No payment = 402 response with payment requirements. No exceptions.

## OKX OnchainOS API

Base URL: `https://web3.okx.com` (or sandbox for dev)
Auth: OKX API key in `Authorization` header (from `OKX_API_KEY` env var)
Client: `packages/scoring/src/lib/okx-client.ts`
Timeout: 3s; on timeout → return cached score with `{ stale: true }` flag.

## Testing Instructions

```bash
bun run lint:fix          # auto-fix lint issues
bun run lint              # must pass: zero errors, zero warnings
bun run type-check        # must pass: zero errors
bun run test              # unit tests (Vitest)
bun run test:integration  # integration tests
bun run harness validate  # all of the above in sequence (run before EVERY commit)
```

Run single test: `bun run vitest run path/to/test.ts`

**Rule: run `bun run harness validate` before EVERY commit. No exceptions.**

## Deploy Instructions

```bash
# Vercel auto-deploys on push to main (production)
# PRs get preview deploys automatically

# Manual deploy:
bunx vercel --prod

# DB schema changes:
bun run db:generate   # generate migration
bun run db:push       # push to Turso (dev) or TURSO_URL (prod)
```

## PR Conventions

Format: `[scope] short description`

Scopes from this project's domains:
- `feat(scoring)` — scoring engine changes
- `feat(auth)` — SIWE / wallet auth
- `feat(x402)` — payment middleware or credential issuance
- `feat(dashboard)` — web dashboard UI
- `feat(api)` — enterprise API
- `feat(mcp)` — MCP server or tools
- `feat(cli)` — CLI tool
- `fix(...)` — bug fixes in any domain
- `chore(...)` — infrastructure, deps, config
- `test(...)` — test additions only

## Idle Protocol

When all milestones are complete:
1. `bun run harness validate:full`
2. `bun run harness changelog`
3. Report to user with suggested version number
4. Wait for user confirmation before tagging
