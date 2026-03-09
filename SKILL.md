---
name: okx-onchainos-credit
version: 0.1.0
description: >
  On-chain credit scoring skill for OKX OnchainOS Credit. Computes a verifiable
  300–850 FICO-equivalent credit score from any wallet's on-chain history across
  60+ chains using OKX OnchainOS APIs (Wallet API, DeFi API, Market API). Scoring
  covers 5 dimensions: wallet age, asset scale, position stability, DeFi repayment
  history, and multi-chain activity. Designed for autonomous agent consumption —
  each query is billed automatically via x402 (OKX X Layer, zero gas). Use this
  skill when an entity needs to assess a wallet's creditworthiness, determine loan
  eligibility, or generate a verifiable credential for under-collateralized lending.
author: OKX OnchainOS Credit
license: proprietary
transport:
  - stdio        # local / dev
  - sse          # remote / production
payment:
  protocol: x402
  network: xlayer
  per_call: true
  note: >
    All tools are gated by x402. The agent must handle the HTTP 402 → pay → retry
    flow automatically. On X Layer, gas is zero — payment settles instantly.
---

## When to Use This Skill

Use this skill when OpenClaw or any agent needs to:

- **Check a wallet's credit score** before approving a loan or membership
- **Investigate creditworthiness** of a counterparty wallet
- **Generate improvement advice** for a user who wants better loan terms
- **Verify a submitted credential** from a user claiming a credit score

Do NOT use this skill for:
- Trading or price queries (use OKX Trade AI / Market AI skills instead)
- Wallet identity verification (this is credit scoring, not KYC)
- Real-time transaction monitoring

---

## Payment Model (x402 — Automatic)

Every tool call requires an x402 micropayment on OKX X Layer. The agent handles
the payment autonomously — no human approval needed.

**Flow:**
```
Agent calls tool
  → Server responds: HTTP 402 + { paymentRequired: { network: "xlayer", chainId: 196, token: "USDC", amount, recipient } }
  → Agent pays via ERC-20 transfer (USDC/USDT/USDG on X Layer, zero gas)
  → Agent calls OKX verify endpoint → gets payment receipt
  → Agent retries request with Payment-Signature header
  → Server verifies via OKX settle endpoint → returns result
```

**Prices:**
| Tool | Price |
|------|-------|
| `get_score` | $0.10 per call |
| `analyze_credit` | $0.50 per call |
| `get_improvement_tips` | $0.10 per call |
| `verify_credential` | $0.05 per call |

---

## Tools

### `get_score`
**Fast credit score lookup.** Returns score + 5-dimension breakdown only.
Use this for quick eligibility checks (e.g., "does this wallet qualify for the loan?").

**Input:**
```json
{
  "wallet": "0xABCD...1234"
}
```
- `wallet` (string, required): EVM wallet address (EIP-55 checksummed or lowercase)

**Output:**
```json
{
  "wallet": "0xABCD...1234",
  "score": 720,
  "tier": "good",
  "dimensions": {
    "walletAge": 78,
    "assetScale": 65,
    "positionStability": 71,
    "repaymentHistory": 82,
    "multichain": 55
  },
  "computedAt": "2026-03-09T12:00:00Z",
  "expiresAt": "2026-03-10T12:00:00Z",
  "cached": false
}
```

**Score tiers:**
| Score | Tier | Lending implication |
|-------|------|---------------------|
| 750–850 | excellent | Under-collateralized lending eligible |
| 650–749 | good | Reduced collateral required |
| 500–649 | fair | Standard collateral |
| 300–499 | poor | Standard collateral + education recommended |

---

### `analyze_credit`
**Full credit analysis.** Returns score, breakdown, improvement tips, and a
signed credential payload. Use when the agent needs to provide a complete
credit assessment to the user or institution.

**Input:**
```json
{
  "wallet": "0xABCD...1234",
  "issue_credential": false
}
```
- `wallet` (string, required): EVM wallet address
- `issue_credential` (boolean, optional, default: false): If true, returns an
  ECDSA-signed verifiable credential in the response (higher price tier)

**Output:**
```json
{
  "wallet": "0xABCD...1234",
  "score": 720,
  "tier": "good",
  "dimensions": {
    "walletAge": { "score": 78, "detail": "Wallet active for 2.5 years, 340 transactions" },
    "assetScale": { "score": 65, "detail": "Portfolio value ~$28,400 USD" },
    "positionStability": { "score": 71, "detail": "Avg holding duration 8.2 months" },
    "repaymentHistory": { "score": 82, "detail": "12/14 loans repaid on time (86%)" },
    "multichain": { "score": 55, "detail": "Active on 4 chains: ETH, ARB, OP, X Layer" }
  },
  "improvementTips": [
    { "dimension": "multichain", "action": "Expand activity to 2 more chains", "estimatedGain": 15 },
    { "dimension": "assetScale", "action": "Grow portfolio above $50k threshold", "estimatedGain": 12 }
  ],
  "credential": null,
  "computedAt": "2026-03-09T12:00:00Z",
  "expiresAt": "2026-03-10T12:00:00Z"
}
```

---

### `get_improvement_tips`
**Ranked improvement tips only.** Lightweight tool to advise users on how to
raise their score. Use when the user asks "how can I improve my credit score?"

**Input:**
```json
{
  "wallet": "0xABCD...1234",
  "limit": 3
}
```
- `wallet` (string, required): EVM wallet address
- `limit` (integer, optional, default: 3, max: 5): Number of tips to return

**Output:**
```json
{
  "wallet": "0xABCD...1234",
  "currentScore": 720,
  "tips": [
    {
      "rank": 1,
      "dimension": "multichain",
      "action": "Activate wallet on 2 more chains (e.g., Sui, Solana)",
      "estimatedGain": 15,
      "difficulty": "easy"
    },
    {
      "rank": 2,
      "dimension": "assetScale",
      "action": "Grow total portfolio above $50,000 USD",
      "estimatedGain": 12,
      "difficulty": "medium"
    },
    {
      "rank": 3,
      "dimension": "repaymentHistory",
      "action": "Repay outstanding Aave loan (increases repayment ratio to 92%)",
      "estimatedGain": 8,
      "difficulty": "easy"
    }
  ]
}
```

---

### `verify_credential`
**Verify an ECDSA-signed credential.** Use when a user submits a credential
and the institution needs to confirm it is authentic and unexpired.

**Input:**
```json
{
  "credential": {
    "version": "1.0",
    "issuer": "okx-onchainos-credit",
    "wallet": "0xABCD...1234",
    "score": 720,
    "tier": "good",
    "issuedAt": 1741521600,
    "expiresAt": 1741608000,
    "signature": "0x..."
  }
}
```

**Output:**
```json
{
  "valid": true,
  "wallet": "0xABCD...1234",
  "score": 720,
  "tier": "good",
  "issuedAt": "2026-03-09T12:00:00Z",
  "expiresAt": "2026-03-10T12:00:00Z",
  "expired": false
}
```

---

## Error Responses

All tools return structured MCP errors — never raw exceptions.

| Code | Meaning | Agent action |
|------|---------|--------------|
| `INVALID_WALLET` | Address is not a valid EVM address | Do not retry. Ask user for correct address. |
| `INSUFFICIENT_HISTORY` | Wallet has < 30 days on-chain history | Return to user: "Not enough history to score. Start using DeFi." |
| `PAYMENT_FAILED` | x402 payment could not be verified | Retry payment. Check X Layer balance. |
| `OKX_API_TIMEOUT` | OKX OnchainOS API timed out | Retry once. If persists, return cached score with `stale: true`. |
| `CREDENTIAL_EXPIRED` | Submitted credential is past expiresAt | Tell user to purchase a new credential. |
| `CREDENTIAL_INVALID_SIGNATURE` | Signature does not match issuer | Reject credential. Do not trust. |

---

## Agent Usage Examples

### Chinese (for OpenClaw)
```
"帮我查一下 0xABCD...1234 这个钱包的链上信用评分"
→ use: get_score

"分析这个钱包的完整信用情况，包括每个维度的详细分析"
→ use: analyze_credit

"这个钱包怎么提高信用评分？"
→ use: get_improvement_tips

"这份信用凭证是真的吗？" [user submits credential JSON]
→ use: verify_credential
```

### English
```
"What is the credit score for wallet 0xABCD...?"
→ use: get_score

"Give me a full credit analysis for this wallet"
→ use: analyze_credit

"How can this wallet owner improve their credit score?"
→ use: get_improvement_tips

"Verify this credential before approving the loan"
→ use: verify_credential
```

---

## Connection

### Local / Development (stdio)
```bash
# Install dependencies
bun install

# Set env vars
cp .env.example .env  # fill in OKX_API_KEY, ECDSA_PRIVATE_KEY, X402 config

# Run MCP server
bun run --cwd packages/mcp start
```

MCP config (`claude_desktop_config.json` / `opencode_config.json`):
```json
{
  "mcpServers": {
    "okx-onchainos-credit": {
      "command": "bun",
      "args": ["run", "--cwd", "/path/to/okx-onchainos-credit/packages/mcp", "start"],
      "env": {
        "OKX_API_KEY": "<your-key>",
        "OKX_SECRET_KEY": "<your-secret>",
        "OKX_PASSPHRASE": "<your-passphrase>",
        "ECDSA_PRIVATE_KEY": "<signing-key>"
      }
    }
  }
}
```

### Remote / Production (SSE)
```
Base URL: https://credit.okx-onchainos.com   (configure in deployment)
Transport: Server-Sent Events (SSE)
Auth: x402 per-call payment (no API key required — payment IS the auth)
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OKX_API_KEY` | Yes | OKX OnchainOS API key |
| `OKX_SECRET_KEY` | Yes | OKX API secret |
| `OKX_PASSPHRASE` | Yes | OKX API passphrase |
| `ECDSA_PRIVATE_KEY` | Yes | secp256k1 private key for credential signing |
| `TURSO_DATABASE_URL` | Yes | Turso DB URL for score caching |
| `TURSO_AUTH_TOKEN` | Yes | Turso auth token |
| `X402_NETWORK` | Yes | Must be `xlayer` |
| `OKX_BASE_URL` | No | Defaults to `https://web3.okx.com` |
