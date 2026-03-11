# Product Requirements Document: OKX OnchainOS Credit

## 1. Overview

OKX OnchainOS Credit is an on-chain credit scoring platform that uses wallet transaction history, DeFi repayment behavior, and portfolio quality from OKX OnchainOS APIs to generate a verifiable 300–850 credit score (FICO-equivalent). Retail DeFi users connect their wallet to check and improve their score, then pay via x402 to receive an ECDSA-signed verifiable credential. DeFi protocols and Neo Banks query wallet scores through a pay-per-use x402 enterprise API to enable under-collateralized lending. AI agents and developers interact with the system via an MCP server (OpenClaw Skill) and CLI tool.

**Launch scope:** Production release targets the web app and enterprise API first. MCP and CLI are included in-repo but treated as preview/internal tooling until they share the same cache/fallback contract and packaged distribution flow.

**Market context:** On-chain private credit TVL reached $9.68B in 2025 (+930% YoY). Spectral and Credora offer scoring but are closed to retail users and have no agent/MCP support. This product fills both gaps.

---

## 2. User Personas

| Persona | Role | Primary Goal | Pain Point |
|---------|------|-------------|------------|
| DeFi Retail User | Wallet owner with on-chain history | Understand and improve credit score to unlock better loan terms | No way to leverage years of on-chain activity for financial credibility |
| DeFi Protocol / Neo Bank | API consumer (borrowing/lending platform) | Assess borrower creditworthiness without requiring full collateral | Either require 150%+ collateral (bad UX) or take on unknown credit risk |
| Developer / AI Agent | API/MCP consumer | Analyze wallet creditworthiness programmatically, automate lending decisions | No agent-callable credit scoring API exists |

---

## 3. User Journeys

**Journey: Retail User Gets Their Score**
- Persona: DeFi Retail User
- Trigger: User wants to know their creditworthiness or improve loan terms
- Steps:
  1. User lands on dashboard → connects wallet (WalletConnect)
  2. User signs SIWE message → authenticated
  3. System checks cache → if stale/miss, calls OKX OnchainOS APIs to compute score
  4. Score (300–850) + breakdown (5 dimensions) + improvement tips displayed
  5. User optionally pays via x402 (USDC on X Layer (Chain ID: 196)) → ECDSA-signed credential issued
  6. User shares/submits credential to lending protocol
- Success state: User has score + optional verifiable credential
- Error states: Wallet has no on-chain history (score = 300 minimum with explanation), x402 payment fails (retry), OKX API timeout (show cached score or error)

**Journey: Protocol Queries a Wallet Score**
- Persona: DeFi Protocol
- Trigger: User submits borrow request; protocol needs creditworthiness check
- Steps:
  1. Protocol sends `GET /api/v1/score?wallet=0xABCD`
  2. Server responds with `402` + payment requirements when `Payment-Signature` is missing
  3. Protocol obtains a valid x402 receipt, retries with `Payment-Signature`, and server verifies the receipt terms before settlement
  4. Server settles the payment and returns score + breakdown JSON + ECDSA signature
  5. Protocol adjusts collateral requirement based on score bracket
- Success state: Protocol receives score, user gets better loan terms
- Error states: Wallet not found (returns 300 base score), x402 payment invalid (402), rate limit exceeded (429)

**Journey: AI Agent Analyzes Credit**
- Persona: AI Agent / Developer
- Trigger: User asks agent: "分析这个钱包的链上信用情况"
- Steps:
  1. Agent calls MCP tool `analyze_credit` with wallet address
  2. Tool fetches score, breakdown, improvement tips
  3. Agent returns natural language analysis with actionable advice
- Success state: Agent delivers complete credit analysis in natural language
- Error states: Invalid wallet address (structured error), API unavailable (graceful degradation)

---

## 4. Functional Requirements

| ID | Requirement | Acceptance Criteria | Priority | Journey |
|----|-------------|-------------------|----------|---------|
| FR-001 | Wallet connection via WalletConnect | User can connect any EVM wallet; server issues a one-time SIWE nonce; session persisted in cookie; disconnect clears session | Must | All |
| FR-002 | Credit score generation | Score 300–850 computed from 5 dimensions using OKX OnchainOS APIs; returns within 5s; score + dimension breakdown returned | Must | Retail, Protocol |
| FR-003 | Score dimension: wallet age + activity | Wallet creation date + transaction frequency scored; oldest active wallets score highest | Must | Score Engine |
| FR-004 | Score dimension: asset scale | Total portfolio value in USD via OKX Market API; recency-weighted | Must | Score Engine |
| FR-005 | Score dimension: position stability | Avg holding duration + volatility exposure; HODLers score higher | Must | Score Engine |
| FR-006 | Score dimension: DeFi repayment history | Borrow + repay events from OKX DeFi API; on-time repayments weighted positively | Must | Score Engine |
| FR-007 | Score dimension: multi-chain activity | Number of chains active on (60+ supported by OKX) + cross-chain volume | Must | Score Engine |
| FR-008 | Score caching | Scores cached in Turso with 24h TTL; cache invalidated on significant wallet event | Must | Performance |
| FR-009 | x402 credential issuance (retail) | User pays USDC via x402; ECDSA-signed JSON credential issued; downloadable; expires in 30 days | Must | Retail |
| FR-010 | Score dashboard | Score gauge (300–850 visual), breakdown per dimension, percentile rank, improvement tips | Must | Retail |
| FR-011 | Improvement tips | Personalized tips based on lowest-scoring dimensions (e.g., "Repay outstanding Aave loan to +45 pts") | Should | Retail |
| FR-012 | x402 enterprise API | GET /api/v1/score — x402 gated, returns score + breakdown + ECDSA signature; rate limited per payer | Must | Protocol |
| FR-013 | Credential verification endpoint | GET /api/v1/credential/verify — verify ECDSA signature on a credential JSON | Should | Protocol |
| FR-014 | API audit log | Every x402 API call logged to Turso (wallet queried, payer, timestamp, score returned) | Must | Protocol |
| FR-015 | MCP server — analyze_credit tool | Returns full credit analysis in structured JSON for agent consumption | Should | Agent |
| FR-016 | MCP server — get_score tool | Returns score + breakdown only (lighter tool) | Should | Agent |
| FR-017 | MCP server — get_improvement_tips tool | Returns ranked improvement tips with point estimates | Should | Agent |
| FR-018 | SKILL.md agent discovery | SKILL.md at project root; all tools documented with schemas | Should | Agent |
| FR-019 | Developer CLI | `okx-credit score <wallet>` → JSON output; `okx-credit verify <credential>` → valid/invalid | Should | Developer |
| FR-020 | Score history trend | Line chart showing score over last 90 days (requires 90d data from OKX APIs) | Could | Retail |
| FR-021 | EAS on-chain attestation | Score as EAS attestation on Ethereum/Base; queryable by any on-chain contract | Could | Protocol |

---

## 5. Non-Functional Requirements

| ID | Category | Requirement | Metric | Priority |
|----|----------|-------------|--------|----------|
| NFR-001 | Performance | Score generation time | < 5s P95 (from cache miss to score) | Must |
| NFR-002 | Performance | API response time | < 500ms P95 for cached scores | Must |
| NFR-003 | Reliability | Uptime | 99.9% monthly uptime for enterprise API | Must |
| NFR-004 | Security | ECDSA signing | Credentials cryptographically signed; private key in env, never in code | Must |
| NFR-005 | Privacy | Wallet data | Raw transaction data NOT stored; only computed score + metadata stored | Must |
| NFR-006 | Security | SIWE auth | Wallet signature verified server-side; session tokens httpOnly cookie, 7d expiry | Must |
| NFR-007 | Security | x402 verification | Every API call verifies payment before returning data; no payment = 402 | Must |
| NFR-008 | Observability | Structured logging | JSON logs with wallet hash (not full address), request ID, score tier, duration | Must |
| NFR-009 | Reliability | OKX API fallback | If OKX API times out > 3s, return cached score with staleness flag | Should |
| NFR-010 | Compliance | Rate limiting | Enterprise API: 100 req/min per x402 payer per resource | Must |
| NFR-011 | Accessibility | WCAG | Dashboard meets WCAG 2.1 AA | Should |
| NFR-012 | Security | Input validation | All wallet addresses validated as EIP-55 checksummed before API calls | Must |

---

## 6. Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Frontend + API | Next.js (App Router) | Full-stack, SSR/API routes, excellent Web3 ecosystem |
| Hosting | Vercel | Auto-deploy on git push, preview deploys, edge functions |
| Database | Turso (libSQL) + Drizzle ORM | Serverless SQLite, edge-compatible, Vercel integration |
| Data layer | OKX OnchainOS APIs | Wallet API + DeFi API + Market API across 60+ chains |
| Auth | SIWE (Sign-In with Ethereum) | Wallet-native, no account system needed |
| Payments | x402 (OKX X Layer native, zero gas) | Internet-native, agent-compatible, low-friction |
| Credentials | ECDSA-signed JSON | Verifiable, no gas, upgradeable to EAS v1.5 |
| Package manager | bun workspaces | Fast, monorepo-ready |
| MCP server | TypeScript (@modelcontextprotocol/sdk) | Agent/Claude integration |
| CLI | TypeScript (Commander.js, bun) | Developer tooling |
| CI/CD | GitHub Actions + Vercel auto-deploy | PR lint/test, auto-deploy on merge |

---

## 7. Data Model

### credit_scores (Turso)
```sql
id          TEXT PRIMARY KEY
wallet      TEXT NOT NULL          -- EIP-55 checksummed address
chain_id    TEXT NOT NULL          -- 'evm' for multi-chain aggregated
score       INTEGER NOT NULL       -- 300-850
dim_wallet_age      INTEGER        -- 0-100
dim_asset_scale     INTEGER        -- 0-100
dim_position_stability INTEGER     -- 0-100
dim_repayment       INTEGER        -- 0-100
dim_multichain      INTEGER        -- 0-100
computed_at DATETIME NOT NULL
expires_at  DATETIME NOT NULL      -- computed_at + 24h
raw_data_hash TEXT                 -- SHA256 of input data (for auditing, not raw data)
```

### audit_log (Turso)
```sql
id          TEXT PRIMARY KEY
event_type  TEXT NOT NULL          -- 'credential_issued' | 'api_query' | 'score_computed'
wallet_hash TEXT NOT NULL          -- SHA256 of wallet address (privacy)
payer       TEXT                   -- x402 payer address
x402_tx     TEXT                   -- x402 payment reference
score_tier  TEXT                   -- 'excellent'|'good'|'fair'|'poor'
created_at  DATETIME NOT NULL
```

---

## 8. Scoring Algorithm

**Formula:** `score = 300 + (sum of 5 weighted dimension scores) * 550/500`

| Dimension | Weight | Score Basis |
|-----------|--------|-------------|
| Wallet Age + Activity | 20% | Age in months (0-48+) × activity frequency |
| Asset Scale | 25% | Total portfolio value: <$100 → 0, $100k+ → 100 |
| Position Stability | 20% | Avg holding > 6 months → high score; < 1 week → low |
| DeFi Repayment | 25% | Repay events / (borrow + repay); on-time weight bonus |
| Multi-chain Activity | 10% | # of active chains (1 → 20pts, 5+ → 100pts) |

**Score brackets:**
- 750–850: Excellent (under-collateralized lending eligible)
- 650–749: Good (reduced collateral)
- 500–649: Fair (standard collateral)
- 300–499: Poor (standard collateral + education shown)

---

## 9. Epics + Stories

### Epic E1: Authentication + Session
- **E1-S01**: Wallet connection (WalletConnect + wagmi/viem, any EVM wallet)
- **E1-S02**: SIWE auth (sign message, verify server-side, httpOnly session cookie)
- **E1-S03**: Session management (persist, refresh, disconnect)

### Epic E2: Score Engine
- **E2-S01**: OKX OnchainOS data ingestion (Wallet API, DeFi API, Market API)
- **E2-S02**: 5-dimension scoring algorithm
- **E2-S03**: Score aggregation + normalization (300–850)
- **E2-S04**: Score caching (Turso, 24h TTL)

### Epic E3: x402 + Credential Issuance
- **E3-S01**: x402 middleware (HTTP 402 → payment → verify USDC)
- **E3-S02**: ECDSA signing service (env-based private key)
- **E3-S03**: Credential issuance endpoint + audit log

### Epic E4: Web Dashboard
- **E4-S01**: Landing page + wallet connect flow
- **E4-S02**: Score dashboard (gauge, breakdown, tips)
- **E4-S03**: Credential issuance CTA + download
- **E4-S04**: Mobile responsive + a11y

### Epic E5: Enterprise API
- **E5-S01**: /api/v1/score endpoint (x402 gated)
- **E5-S02**: /api/v1/credential/verify endpoint
- **E5-S03**: Rate limiting + audit log

### Epic E6: MCP Server + CLI
- **E6-S01**: MCP server (3 tools: analyze_credit, get_score, get_improvement_tips)
- **E6-S02**: SKILL.md + api-reference.md
- **E6-S03**: CLI (okx-credit score/verify)
- **E6-S04**: Integration tests (MCP lifecycle + CLI)

---

## 10. Out of Scope (v1)

- Mobile app (iOS/Android)
- ZK-proof score range
- EAS on-chain attestation
- Social graph scoring
- Non-EVM chain scoring (pending OKX API coverage confirmation)
- Score dispute/appeal mechanism
- Traditional email/password login
