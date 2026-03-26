---
name: graxis
version: 0.1.0
description: >
  MCP skill for Graxis. Use it to score an EVM wallet, run a
  full credit analysis, or return ranked score-improvement tips based on the
  wallet's on-chain history.
author: Graxis
license: proprietary
transport:
  - stdio
---

## When to Use This Skill

Use this skill when an agent needs to:

- Check whether an EVM wallet is creditworthy enough for a lending or membership decision
- Produce a structured on-chain credit report with dimension-level explanations
- Advise a user on the highest-leverage actions to improve their score

Do not use this skill for:

- Real-time trading or market-data queries
- Wallet identity verification / KYC
- Credential verification

## Current Scope

The current MCP server exposes exactly 3 tools:

1. `analyze_credit`
2. `get_score`
3. `get_improvement_tips`

`verify_credential` is not exposed as an MCP tool in the current build.

## Tool Summary

### `get_score`

Use for fast score lookup.

Input:

```json
{
  "wallet": "0x1234567890abcdef1234567890abcdef12345678"
}
```

Output:

```json
{
  "wallet": "0x1234567890abcdef1234567890abcdef12345678",
  "score": 689,
  "tier": "good",
  "dimensions": {
    "walletAge": 85,
    "assetScale": 70,
    "positionStability": 66,
    "repaymentHistory": 73,
    "multichain": 50
  },
  "computedAt": "2026-03-10T00:00:00.000Z",
  "expiresAt": "2026-03-11T00:00:00.000Z",
  "dataGaps": ["no_defi_history"]
}
```

### `analyze_credit`

Use for a full analysis with score details and ranked tips.

Input:

```json
{
  "wallet": "0x1234567890abcdef1234567890abcdef12345678",
  "issue_credential": false
}
```

Notes:

- `issue_credential` is currently reserved for future use.
- The current implementation always returns `"credential": null`.

Output:

```json
{
  "wallet": "0x1234567890abcdef1234567890abcdef12345678",
  "score": 712,
  "tier": "good",
  "dimensions": {
    "walletAge": {
      "score": 88,
      "detail": "Wallet active for 24 months with 180 transactions."
    },
    "assetScale": {
      "score": 74,
      "detail": "Portfolio value $18,000 across 4 tracked positions."
    },
    "positionStability": {
      "score": 69,
      "detail": "Average holding duration 6 months across 4 active positions."
    },
    "repaymentHistory": {
      "score": 81,
      "detail": "Repaid 9/10 borrow positions with no liquidations."
    },
    "multichain": {
      "score": 50,
      "detail": "Active on 3 chains: Arbitrum, Ethereum, X Layer."
    }
  },
  "improvementTips": [
    {
      "action": "Repay DeFi borrows cleanly and avoid leaving debt open through volatile periods.",
      "currentValue": 81,
      "dimensionKey": "repaymentHistory",
      "dimensionLabel": "Repayment history",
      "estimatedPointGain": 26
    }
  ],
  "credential": null,
  "computedAt": "2026-03-10T00:00:00.000Z",
  "expiresAt": "2026-03-11T00:00:00.000Z"
}
```

### `get_improvement_tips`

Use when the user asks how to improve their score.

Input:

```json
{
  "wallet": "0x1234567890abcdef1234567890abcdef12345678",
  "limit": 3
}
```

Rules:

- `limit` defaults to `3`
- `limit` must be between `1` and `5`

Output:

```json
{
  "wallet": "0x1234567890abcdef1234567890abcdef12345678",
  "currentScore": 689,
  "tips": [
    {
      "action": "Repay DeFi borrows cleanly and avoid leaving debt open through volatile periods.",
      "currentValue": 60,
      "dimensionKey": "repaymentHistory",
      "dimensionLabel": "Repayment history",
      "estimatedPointGain": 40
    }
  ]
}
```

## Error Model

All tools return structured MCP errors instead of raw exceptions.

Common error codes:

- `INVALID_WALLET`
- `OKX_API_TIMEOUT`
- `ANALYSIS_FAILED`
- `SCORE_LOOKUP_FAILED`
- `IMPROVEMENT_TIPS_FAILED`

Error shape:

```json
{
  "error": {
    "code": "INVALID_WALLET",
    "message": "Wallet must be a valid 0x-prefixed 20-byte EVM address.",
    "wallet": "not-a-wallet"
  }
}
```

## Connection

### Local stdio

Run:

```bash
bun install
bun run --cwd packages/mcp start
```

Example MCP config:

```json
{
  "mcpServers": {
    "graxis": {
      "command": "bun",
      "args": ["run", "--cwd", "/path/to/graxis/packages/mcp", "start"],
      "env": {
        "OKX_API_KEY": "<okx-key>",
        "OKX_SECRET_KEY": "<okx-secret>",
        "OKX_PASSPHRASE": "<okx-passphrase>"
      }
    }
  }
}
```

Required environment variables:

- `OKX_API_KEY`
- `OKX_SECRET_KEY`
- `OKX_PASSPHRASE`

Optional:

- `OKX_BASE_URL`

## Reference

Full request/response schemas live in `docs/api-reference.md`.
