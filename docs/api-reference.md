# API Reference

This document describes the current MCP surface implemented in `packages/mcp`.

## Server

- Transport: `stdio`
- Tools: `analyze_credit`, `get_score`, `get_improvement_tips`
- Wallet input format: `0x`-prefixed 20-byte EVM address

## Shared Types

### `ScoreTier`

```json
["excellent", "good", "fair", "poor"]
```

### `ScoreDimensions`

```json
{
  "walletAge": 0,
  "assetScale": 0,
  "positionStability": 0,
  "repaymentHistory": 0,
  "multichain": 0
}
```

Every dimension score is an integer from `0` to `100`.

### `CreditAnalysisDimension`

```json
{
  "score": 0,
  "detail": "Human-readable explanation"
}
```

### `CreditImprovementTip`

```json
{
  "action": "What the wallet owner should do next",
  "currentValue": 60,
  "dimensionKey": "repaymentHistory",
  "dimensionLabel": "Repayment history",
  "estimatedPointGain": 40
}
```

`dimensionKey` is one of:

- `walletAge`
- `assetScale`
- `positionStability`
- `repaymentHistory`
- `multichain`

## Tool: `get_score`

### Request

```json
{
  "wallet": "0x1234567890abcdef1234567890abcdef12345678"
}
```

Schema:

```json
{
  "type": "object",
  "properties": {
    "wallet": {
      "type": "string",
      "description": "EVM wallet address to score"
    }
  },
  "required": ["wallet"]
}
```

### Success Response

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

Notes:

- `dataGaps` is optional.
- `computedAt` and `expiresAt` are ISO timestamps.

## Tool: `analyze_credit`

### Request

```json
{
  "wallet": "0x1234567890abcdef1234567890abcdef12345678",
  "issue_credential": false
}
```

Schema:

```json
{
  "type": "object",
  "properties": {
    "wallet": {
      "type": "string",
      "description": "EVM wallet address to analyze"
    },
    "issue_credential": {
      "type": "boolean",
      "description": "Reserved for future credential issuance. Current implementation always returns credential=null."
    }
  },
  "required": ["wallet"]
}
```

### Success Response

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
  "expiresAt": "2026-03-11T00:00:00.000Z",
  "dataGaps": ["no_defi_history"]
}
```

Notes:

- `credential` is always `null` in the current implementation.
- `improvementTips` is already ranked from highest to lowest estimated point gain.
- `dataGaps` is optional.

## Tool: `get_improvement_tips`

### Request

```json
{
  "wallet": "0x1234567890abcdef1234567890abcdef12345678",
  "limit": 3
}
```

Schema:

```json
{
  "type": "object",
  "properties": {
    "wallet": {
      "type": "string",
      "description": "EVM wallet address to analyze"
    },
    "limit": {
      "type": "integer",
      "minimum": 1,
      "maximum": 5,
      "description": "Maximum number of tips to return"
    }
  },
  "required": ["wallet"]
}
```

### Success Response

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
    },
    {
      "action": "Build credible activity on more supported chains instead of concentrating usage on a single venue.",
      "currentValue": 50,
      "dimensionKey": "multichain",
      "dimensionLabel": "Multichain activity",
      "estimatedPointGain": 28
    }
  ]
}
```

Notes:

- `limit` defaults to `3` when omitted.
- Tips are returned in ranked order.

## Error Responses

All tool failures return MCP `isError: true` with structured content in this shape:

```json
{
  "error": {
    "code": "INVALID_WALLET",
    "message": "Wallet must be a valid 0x-prefixed 20-byte EVM address.",
    "wallet": "not-a-wallet"
  }
}
```

### Common Error Codes

#### `INVALID_WALLET`

- Returned by all tools when `wallet` is not a valid EVM address

#### `OKX_API_TIMEOUT`

- Returned when upstream OKX data fetches time out

#### `ANALYSIS_FAILED`

- Returned by `analyze_credit` for non-timeout failures

#### `SCORE_LOOKUP_FAILED`

- Returned by `get_score` for non-timeout failures

#### `IMPROVEMENT_TIPS_FAILED`

- Returned by `get_improvement_tips` for non-timeout failures

## Local Runbook

Install and run:

```bash
bun install
bun run --cwd packages/mcp start
```

Required environment variables:

- `OKX_API_KEY`
- `OKX_SECRET_KEY`
- `OKX_PASSPHRASE`

Optional:

- `OKX_BASE_URL`
