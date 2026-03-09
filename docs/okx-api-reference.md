# OKX OnchainOS API Reference

> Verified from docs: https://web3.okx.com/onchainos/dev-docs/
> Last fetched: 2026-03-09
> Use this file when implementing `packages/scoring/src/lib/okx-client.ts`

---

## Base URL

```
https://web3.okx.com
```

---

## Authentication

All requests require **four headers**. The signature must be regenerated per request.

```
OK-ACCESS-KEY        → your API key
OK-ACCESS-TIMESTAMP  → UTC timestamp, ISO 8601 (e.g. "2026-03-09T12:00:00.000Z")
OK-ACCESS-PASSPHRASE → passphrase set when creating the API key
OK-ACCESS-SIGN       → Base64(HMAC-SHA256(prehash, secretKey))
```

### Signature generation

```
prehash = timestamp + METHOD + requestPath + body

// GET  → body = ""
// POST → body = JSON.stringify(requestBody)

sign = Base64(HMAC-SHA256(prehash, OKX_SECRET_KEY))
```

**Constraint:** The timestamp in the header must be within ±30 seconds of OKX server time.

### TypeScript reference implementation (for M1-004)

```typescript
import { createHmac } from 'node:crypto';

function sign(method: string, path: string, body: string, secretKey: string): string {
  const ts = new Date().toISOString();
  const prehash = ts + method.toUpperCase() + path + body;
  const sig = createHmac('sha256', secretKey).update(prehash).digest('base64');
  return sig; // return ts alongside so caller can set OK-ACCESS-TIMESTAMP
}
```

---

## 1. Check Balance API

**Base path:** `/api/v6/dex/balance/`

### GET total portfolio value
```
GET /api/v6/dex/balance/total-value-by-address
```
| Param | Required | Notes |
|-------|----------|-------|
| `address` | Yes | wallet address |
| `chains` | Yes | comma-separated chainIndex values, max 50 (e.g. `"1,42161,196"`) |
| `assetType` | No | `0`=all (default), `1`=tokens only, `2`=DeFi only |
| `excludeRiskToken` | No | `true` = filter honeypot/airdrop tokens |

Response: `{ data: [{ totalValue: "1234.56" }] }` — USD string

**Usage in scoring:** Asset Scale dimension — `totalValue` as portfolio USD.

### GET all token balances
```
GET /api/v6/dex/balance/all-token-balances-by-address
```
| Param | Required | Notes |
|-------|----------|-------|
| `address` | Yes | wallet address |
| `chains` | Yes | comma-separated chainIndex values, max 50 |
| `excludeRiskToken` | No | `0`=filter out (default), `1`=include |

Response fields per token: `chainIndex`, `symbol`, `balance`, `tokenPrice` (USD), `isRiskToken`

**Usage in scoring:** Asset Scale — full token breakdown. Position Stability — token composition (stables vs. alts vs. blue-chips).

---

## 2. Transaction History API

**Base path:** `/api/v6/dex/post-transaction/`

### GET transaction history by address
```
GET /api/v6/dex/post-transaction/transactions-by-address
```
| Param | Required | Notes |
|-------|----------|-------|
| `address` | Yes | wallet address |
| `chains` | No | comma-separated chainIndex values, max 50 |
| `tokenContractAddress` | No | filter by token; empty = native coin only; omit = all tokens |
| `begin` | No | start time, Unix ms |
| `end` | No | end time, Unix ms |
| `cursor` | No | pagination cursor from previous response |
| `limit` | No | default 20; max 20 (single chain), max 100 (multi-chain) |

Response per transaction:
```
chainIndex       — chain ID (string)
txHash           — transaction hash
txTime           — Unix timestamp ms
itype            — "0" main coin transfer, "1" contract main coin, "2" token transfer
methodId         — contract function selector (e.g. "0xa9059cbb" = ERC-20 transfer)
from[]           — [{ address, amount }]
to[]             — [{ address, amount }]
tokenContractAddress
amount, symbol
txFee
txStatus         — "success" | "fail" | "pending"
hitBlacklist     — boolean
cursor           — use for next page
```

**Usage in scoring:**
- Wallet Age → `txTime` of earliest transaction
- Activity Frequency → count + spread of transactions over time
- DeFi Repayment → filter by `methodId` for known protocol selectors (Aave, Compound, Morpho)
- Multi-chain → count distinct `chainIndex` values

### GET single transaction detail
```
GET /api/v6/dex/post-transaction/transaction-detail-by-txhash
```
Params: `chainIndex`, `txHash`

---

## 3. Market API

**Base path:** `/api/v6/dex/market/`

### POST token price (latest)
```
POST /api/v6/dex/market/price
Body: { chainIndex: "1", tokenContractAddress: "0x..." }
```
Response: `{ data: [{ chainIndex, tokenContractAddress, time, price }] }`

**Usage in scoring:** Convert token balances to USD for Asset Scale.

### GET candlesticks (OHLCV)
```
GET /api/v6/dex/market/candles
```
| Param | Required | Notes |
|-------|----------|-------|
| `chainIndex` | Yes | e.g. `"1"` for Ethereum |
| `tokenContractAddress` | Yes | lowercase EVM address |
| `bar` | No | timeframe: `1m/3m/5m/15m/30m/1H/2H/4H` (default `1m`) |
| `limit` | No | max 299, default 100 |
| `after` / `before` | No | pagination by timestamp |

Response: array of `[ts, open, high, low, close, vol, volUsd, confirm]`

**Usage in scoring:** Position Stability — price volatility of held assets over time.

### Token API
- `GET /api/v6/dex/market/token/search` — search by name/symbol/address
- `GET /api/v6/dex/market/token/basic-info` — token metadata
- `GET /api/v6/dex/market/token/trading-info` — price, volume, supply, holders, liquidity at timestamp
- `GET /api/v6/dex/market/token/ranking` — rankings by price change / volume / market cap
- `GET /api/v6/dex/market/token/top-holder` — top 20 holder addresses + amounts

**Usage in scoring:** Asset quality — holding top-ranked tokens signals blue-chip behaviour.

---

## 4. Chain Index Reference (key chains)

| chainIndex | Chain |
|-----------|-------|
| `1` | Ethereum |
| `56` | BNB Smart Chain |
| `137` | Polygon |
| `42161` | Arbitrum One |
| `10` | Optimism |
| `8453` | Base |
| `196` | **X Layer** (OKX native — x402 payments) |
| `324` | zkSync Era |
| `534352` | Scroll |
| `501` | Solana |
| `900` | TON |
| `784` | Sui |

> For all chains call `GET /api/v6/dex/balance/supported-chains`.

---

## 5. x402 Payment API

> OKX's OWN x402 implementation — NOT `@coinbase/x402`. Build custom `x402.ts` client.

**Network:** X Layer only (Chain ID: `196`). Base/Solana/BSC coming soon.

**Payment tokens (X Layer mainnet):**
| Token | Contract Address |
|-------|-----------------|
| USDG  | `0x4ae46a509f6b1d9056937ba4500cb143933d2dc8` |
| USDT  | `0x779ded0c9e1022225f8e0630b35a9b54be713736` |
| USDC  | `0x74b7f16337b8972027f6196a17a631ac6de26d22` |

**Gas subsidy:** Zero gas for USDT and USDC on X Layer.
**KYT:** Built-in Know Your Transaction risk detection on all payments.

### API Endpoints
```
GET  /api/v6/wallet/payments/supported  — query supported networks + tokens
POST /api/v6/wallet/payments/verify     — verify a payment tx before settling
POST /api/v6/wallet/payments/settle     — finalize/settle the payment
```

### Payment Flow

```
1. Client → our server:      call tool endpoint (no payment header)
2. Our server → client:      HTTP 402
                             { paymentRequired: {
                                 network: "xlayer", chainId: 196,
                                 token: "USDC",
                                 tokenAddress: "0x74b7...",
                                 amount: "0.10",
                                 recipient: "<our wallet>"
                               }}
3. Client → X Layer:         ERC-20 transfer (USDC to recipient)
4. Client → OKX verify API:  POST /api/v6/wallet/payments/verify { txHash, ... }
                             ← returns signed payment receipt
5. Client → our server:      retry call + header: Payment-Signature: <receipt>
6. Our server → OKX settle:  POST /api/v6/wallet/payments/settle { receipt }
                             ← confirms valid
7. Our server → client:      HTTP 200 + result
```

**Recommend:** Default payment token = USDC. Implement in:
- `packages/mcp/src/lib/x402.ts` — MCP server tool gating
- `apps/web/src/lib/x402.ts` — Enterprise API route middleware

---

## 6. OKX OnchainOS AI Skills + MCP

OKX provides **pre-built Skills and MCP servers** for Trade AI and Market AI.

**Install via agent CLI:**
```bash
npx skills add okx/onchainos-skills
```

**Supported agent platforms:** Claude Code, Cursor, OpenClaw (and any MCP-compatible agent)

**Built-in sandbox keys** — no API key needed for testing.

**Architecture note for M6:**
Our `packages/mcp` server can call OKX's upstream Trade AI + Market AI MCP servers
instead of hitting REST APIs directly. This enables natural language onchain queries
within our own agent tool flow. Evaluate during M6 implementation.

---

## 7. DeFi Repayment Detection Strategy

OKX does NOT have a dedicated "DeFi lending history" endpoint. To detect borrow/repay events,
filter transaction history by known protocol method selectors:

```typescript
const DEFI_SELECTORS: Record<string, string> = {
  // Aave v2/v3
  '0x573ade81': 'aave:borrow',
  '0x69328dec': 'aave:repay',
  '0x617ba037': 'aave:deposit',
  // Compound v2
  '0xa0712d68': 'compound:mint',
  '0xdb006a75': 'compound:redeem',
  '0xf5e3c462': 'compound:repayBorrow',
  // Morpho
  '0x50d8cd4b': 'morpho:supply',
  '0x20d9d0c8': 'morpho:repay',
};
```

Filter `transactionList` where `methodId` matches a known selector AND `txStatus === "success"`.

---

## 8. Implementation Notes

### Rate limits
- Check OKX developer dashboard for per-endpoint limits
- Implement exponential backoff + jitter on HTTP 429
- Cache scores 24h, price data 1h, token metadata 6h

### Pagination
- All history APIs use cursor-based pagination
- Fetch up to 90 days for scoring (configurable)
- Hard stop at 1000 transactions (diminishing scoring returns beyond)

### Multi-chain query strategy
- For scoring: query chains `1,42161,10,8453,196,56,137,501` (top 8)
- For portfolio: query chains where `tokenBalance > 0` (use total-value-by-address first)
- Pass `chains` as comma-separated string of chainIndex values

### Error handling
- `code !== "0"` = API error — check `msg` field
- Retry once on 5xx; surface `OKX_API_TIMEOUT` error after 2 failures
- Cache last-known score with `stale: true` flag on persistent failure
