// OKX OnchainOS API client — implement during M1-004.
// Reference: docs/okx-api-reference.md
//
// Verified API paths (all /api/v6/, NOT /api/v5/):
//   Balance:     GET /api/v6/dex/balance/total-value-by-address
//                GET /api/v6/dex/balance/all-token-balances-by-address
//   Tx History:  GET /api/v6/dex/post-transaction/transactions-by-address
//   Price:       POST /api/v6/dex/market/price
//   Candles:     GET /api/v6/dex/market/candles
//   Top Holders: GET /api/v6/dex/market/token/top-holder
//
// Auth headers: OK-ACCESS-KEY, OK-ACCESS-TIMESTAMP, OK-ACCESS-PASSPHRASE, OK-ACCESS-SIGN
// Sign: Base64(HMAC-SHA256(timestamp + METHOD + path + body, secretKey))
import { createHmac } from 'node:crypto';
import type { TokenPosition, WalletEvent } from '../types.js';

const OKX_BASE_URL = process.env.OKX_BASE_URL ?? 'https://web3.okx.com';

// Chains to query for scoring (top 8 by DeFi activity)
// chainIndex values: 1=ETH, 42161=ARB, 10=OP, 8453=BASE, 196=XLayer, 56=BSC, 137=MATIC, 501=SOL
const SCORING_CHAINS = '1,42161,10,8453,196,56,137';

interface OkxClientConfig {
  apiKey: string;
  secretKey: string;
  passphrase: string;
}

export class OkxClient {
  private config: OkxClientConfig;

  constructor(config: OkxClientConfig) {
    this.config = config;
  }

  static fromEnv(): OkxClient {
    const apiKey = process.env.OKX_API_KEY;
    const secretKey = process.env.OKX_SECRET_KEY;
    const passphrase = process.env.OKX_PASSPHRASE;

    if (!apiKey || !secretKey || !passphrase) {
      throw new Error('OKX_API_KEY, OKX_SECRET_KEY, and OKX_PASSPHRASE must be set');
    }

    return new OkxClient({ apiKey, secretKey, passphrase });
  }

  // Planned in M1-004: implement HMAC-SHA256 auth headers.
  // sign = Base64(HMAC-SHA256(ts + METHOD + path + body, secretKey))
  private buildHeaders(method: string, path: string, body = ''): Record<string, string> {
    const ts = new Date().toISOString();
    const prehash = ts + method.toUpperCase() + path + body;
    const sign = createHmac('sha256', this.config.secretKey).update(prehash).digest('base64');

    return {
      'Content-Type': 'application/json',
      'OK-ACCESS-KEY': this.config.apiKey,
      'OK-ACCESS-TIMESTAMP': ts,
      'OK-ACCESS-PASSPHRASE': this.config.passphrase,
      'OK-ACCESS-SIGN': sign,
    };
  }

  // Planned in M1-004: implement fetch wrapper with timeout and error handling.
  private async get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
    const qs = new URLSearchParams(params).toString();
    const fullPath = qs ? `${path}?${qs}` : path;
    const headers = this.buildHeaders('GET', fullPath);
    const res = await fetch(`${OKX_BASE_URL}${fullPath}`, { headers });
    if (!res.ok) throw new Error(`OKX API error: ${res.status} ${res.statusText}`);
    const json = (await res.json()) as { code: string; msg: string; data: T };
    if (json.code !== '0') throw new Error(`OKX API error: ${json.msg}`);
    return json.data;
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    const bodyStr = JSON.stringify(body);
    const headers = this.buildHeaders('POST', path, bodyStr);
    const res = await fetch(`${OKX_BASE_URL}${path}`, { method: 'POST', headers, body: bodyStr });
    if (!res.ok) throw new Error(`OKX API error: ${res.status} ${res.statusText}`);
    const json = (await res.json()) as { code: string; msg: string; data: T };
    if (json.code !== '0') throw new Error(`OKX API error: ${json.msg}`);
    return json.data;
  }

  // Planned in M1-004: wire up the real endpoint.
  // GET /api/v6/dex/post-transaction/transactions-by-address
  async getWalletHistory(_wallet: string): Promise<WalletEvent[]> {
    throw new Error('Not implemented — complete M1-004');
  }

  // Planned in M1-004: wire up the real endpoint.
  // GET /api/v6/dex/balance/total-value-by-address
  // GET /api/v6/dex/balance/all-token-balances-by-address
  async getWalletPortfolio(_wallet: string): Promise<{
    totalValueUsd: number;
    positions: TokenPosition[];
  }> {
    throw new Error('Not implemented — complete M1-004');
  }

  // Planned in M2-005: filter tx history by DeFi method selectors.
  // See docs/okx-api-reference.md §7 for known selector map (Aave, Compound, Morpho)
  async getDeFiHistory(_wallet: string): Promise<WalletEvent[]> {
    throw new Error('Not implemented — complete M2-005');
  }

  // Planned in M2-003: add price data for position valuation.
  // POST /api/v6/dex/market/price
  async getTokenPrice(_chainIndex: string, _tokenAddress: string): Promise<number> {
    throw new Error('Not implemented — complete M2-003');
  }

  // Planned in M2-003: add candle data for stability volatility calculations.
  // GET /api/v6/dex/market/candles
  async getCandles(_chainIndex: string, _tokenAddress: string): Promise<unknown[]> {
    throw new Error('Not implemented — complete M2-003');
  }

  // Expose for callers that need the default chain set
  static get scoringChains(): string {
    return SCORING_CHAINS;
  }
}
