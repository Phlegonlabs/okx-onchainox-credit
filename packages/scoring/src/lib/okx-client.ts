import { createHmac } from 'node:crypto';
import type {
  DeFiEvent,
  DeFiPositionSnapshot,
  PriceCandle,
  TokenPosition,
  TokenPriceQuote,
  TokenPriceRequest,
  WalletEvent,
} from '../types.js';
import { type OkxRawTx, parseDefiEvents } from './defi-parser.js';
import { OkxRequestError, readRetryAfterMs } from './okx-request-error.js';
import { normalizeOkxRetryDelays, retryOkxRequest } from './okx-request-retry.js';
import { extractTransactionPage, normalizeWalletHistoryTransactions } from './wallet-normalizer.js';

const OKX_BASE_URL = process.env.OKX_BASE_URL ?? 'https://web3.okx.com';
const DEFAULT_TIMEOUT_MS = 3_000;
const DEFAULT_HISTORY_PAGE_LIMIT = 100;
const DEFAULT_MULTI_CHAIN_HISTORY_PAGE_LIMIT = 20;
const MAX_HISTORY_PAGES = 10;
const DEFAULT_CANDLE_LIMIT = 100;
const DEFAULT_MIN_REQUEST_INTERVAL_MS = process.env.NODE_ENV === 'test' ? 0 : 1_000;

const SCORING_CHAINS = '1,42161,10,8453,196,56,137,501';
const endpointRequestSchedule = new Map<string, Promise<number>>();

interface OkxClientConfig {
  apiKey: string;
  secretKey: string;
  passphrase: string;
  baseUrl?: string;
  minRequestIntervalMs?: number;
  retryDelaysMs?: number[];
  timeoutMs?: number;
}

interface OkxApiEnvelope<T> {
  code: string;
  msg: string;
  data: T;
}

interface OkxPortfolioValueItem {
  totalValue: string;
}

interface OkxTokenBalanceItem {
  chainIndex: string;
  tokenContractAddress?: string;
  symbol: string;
  balance: string;
  tokenPrice: string;
}

interface OkxPriceItem {
  chainIndex: string;
  tokenContractAddress: string;
  price: string;
  time: string;
}

type OkxCandleRow = [string, string, string, string, string, string?, string?, string?];

function toNumber(value: string | number | undefined): number {
  const parsed = typeof value === 'number' ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getHistoryPageLimit(chains: string): number {
  const chainCount = chains
    .split(',')
    .map((chain) => chain.trim())
    .filter((chain) => chain.length > 0).length;

  return chainCount > 1 ? DEFAULT_MULTI_CHAIN_HISTORY_PAGE_LIMIT : DEFAULT_HISTORY_PAGE_LIMIT;
}

function sleep(delayMs: number): Promise<void> {
  if (delayMs <= 0) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

async function throttleOkxEndpoint(path: string, minRequestIntervalMs: number): Promise<void> {
  if (minRequestIntervalMs <= 0) {
    return;
  }

  const rateKey = path.split('?')[0] ?? path;
  const previous = endpointRequestSchedule.get(rateKey) ?? Promise.resolve(0);
  let resolveCurrent!: (startedAt: number) => void;
  const current = new Promise<number>((resolve) => {
    resolveCurrent = resolve;
  });
  endpointRequestSchedule.set(rateKey, current);

  const previousStartedAt = await previous;
  const waitMs = Math.max(0, minRequestIntervalMs - (Date.now() - previousStartedAt));
  await sleep(waitMs);
  resolveCurrent(Date.now());
}

export class OkxClient {
  private config: Required<OkxClientConfig>;

  constructor(config: OkxClientConfig) {
    this.config = {
      baseUrl: OKX_BASE_URL,
      minRequestIntervalMs: DEFAULT_MIN_REQUEST_INTERVAL_MS,
      retryDelaysMs: normalizeOkxRetryDelays(config.retryDelaysMs),
      timeoutMs: DEFAULT_TIMEOUT_MS,
      ...config,
    };
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

  private buildHeaders(method: string, path: string, body = ''): Record<string, string> {
    const timestamp = new Date().toISOString();
    const prehash = timestamp + method.toUpperCase() + path + body;
    const sign = createHmac('sha256', this.config.secretKey).update(prehash).digest('base64');

    return {
      'Content-Type': 'application/json',
      'OK-ACCESS-KEY': this.config.apiKey,
      'OK-ACCESS-TIMESTAMP': timestamp,
      'OK-ACCESS-PASSPHRASE': this.config.passphrase,
      'OK-ACCESS-SIGN': sign,
    };
  }

  private async request<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
    return retryOkxRequest(async () => {
      const serializedBody = body ? JSON.stringify(body) : '';
      const headers = this.buildHeaders(method, path, serializedBody);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);
      const requestInit: RequestInit = {
        method,
        headers,
        signal: controller.signal,
      };

      if (serializedBody) {
        requestInit.body = serializedBody;
      }

      try {
        await throttleOkxEndpoint(path, this.config.minRequestIntervalMs);
        const response = await fetch(`${this.config.baseUrl}${path}`, requestInit);

        if (!response.ok) {
          const retryAfterMs = readRetryAfterMs(response.headers.get('retry-after'));
          throw new OkxRequestError(`OKX API error: ${response.status} ${response.statusText}`, {
            ...(retryAfterMs !== undefined ? { retryAfterMs } : {}),
            statusCode: response.status,
          });
        }

        const json = (await response.json()) as OkxApiEnvelope<T>;
        if (json.code !== '0') {
          throw new OkxRequestError(`OKX API error: ${json.msg}`);
        }

        return json.data;
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error('OKX_API_TIMEOUT');
        }

        throw error;
      } finally {
        clearTimeout(timeoutId);
      }
    }, this.config.retryDelaysMs);
  }

  private async get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
    const qs = new URLSearchParams(params).toString();
    const requestPath = qs ? `${path}?${qs}` : path;
    return this.request<T>('GET', requestPath);
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  async getTransactionHistory(wallet: string, chains = SCORING_CHAINS): Promise<OkxRawTx[]> {
    const transactions: OkxRawTx[] = [];
    let cursor: string | undefined;
    const limit = getHistoryPageLimit(chains);

    for (let page = 0; page < MAX_HISTORY_PAGES; page++) {
      const result = await this.get<unknown>(
        '/api/v6/dex/post-transaction/transactions-by-address',
        {
          address: wallet,
          chains,
          limit: String(limit),
          ...(cursor ? { cursor } : {}),
        }
      );

      const parsedPage = extractTransactionPage(result);
      if (parsedPage.transactionList.length === 0 && !parsedPage.cursor) {
        break;
      }

      transactions.push(...parsedPage.transactionList);
      if (!parsedPage.cursor || parsedPage.cursor === cursor) {
        break;
      }

      cursor = parsedPage.cursor;
    }

    return transactions;
  }

  async getWalletHistory(wallet: string, chains = SCORING_CHAINS): Promise<WalletEvent[]> {
    const transactions = await this.getTransactionHistory(wallet, chains);
    return normalizeWalletHistoryTransactions(transactions).events;
  }

  async getWalletPortfolio(
    wallet: string,
    chains = SCORING_CHAINS
  ): Promise<{ totalValueUsd: number; positions: TokenPosition[] }> {
    const portfolioData = await this.get<OkxPortfolioValueItem[]>(
      '/api/v6/dex/balance/total-value-by-address',
      {
        address: wallet,
        chains,
        assetType: '0',
        excludeRiskToken: 'true',
      }
    );
    const tokenBalances = await this.get<OkxTokenBalanceItem[]>(
      '/api/v6/dex/balance/all-token-balances-by-address',
      {
        address: wallet,
        chains,
        excludeRiskToken: '0',
      }
    );

    const totalValueUsd = toNumber(portfolioData[0]?.totalValue);
    const positions = tokenBalances.map((token) => ({
      tokenId: token.tokenContractAddress || `${token.chainIndex}:${token.symbol}`,
      symbol: token.symbol,
      chainId: token.chainIndex,
      balanceUsd: toNumber(token.balance) * toNumber(token.tokenPrice),
    }));

    return { totalValueUsd, positions };
  }

  async getDeFiPositions(wallet: string, chains = SCORING_CHAINS): Promise<DeFiPositionSnapshot> {
    const data = await this.get<OkxPortfolioValueItem[]>(
      '/api/v6/dex/balance/total-value-by-address',
      {
        address: wallet,
        chains,
        assetType: '2',
        excludeRiskToken: 'true',
      }
    );

    const totalValueUsd = toNumber(data[0]?.totalValue);
    return {
      totalValueUsd,
      hasPositions: totalValueUsd > 0,
    };
  }

  async getDeFiHistory(wallet: string, chains = SCORING_CHAINS): Promise<DeFiEvent[]> {
    const transactions = await this.getTransactionHistory(wallet, chains);
    return parseDefiEvents(transactions);
  }

  async getTokenPrices(requests: TokenPriceRequest[]): Promise<TokenPriceQuote[]> {
    const quotes = await Promise.all(
      requests.map(async (request) => {
        const [result] = await this.post<OkxPriceItem[]>('/api/v6/dex/market/price', request);
        if (!result) {
          throw new Error(`OKX API error: missing price for ${request.tokenContractAddress}`);
        }

        return {
          chainIndex: result.chainIndex,
          tokenContractAddress: result.tokenContractAddress,
          price: toNumber(result.price),
          timestamp: toNumber(result.time),
        } satisfies TokenPriceQuote;
      })
    );

    return quotes;
  }

  async getTokenPrice(chainIndex: string, tokenAddress: string): Promise<number> {
    const [quote] = await this.getTokenPrices([{ chainIndex, tokenContractAddress: tokenAddress }]);
    return quote?.price ?? 0;
  }

  async getCandles(
    chainIndex: string,
    tokenAddress: string,
    bar = '1H',
    limit = DEFAULT_CANDLE_LIMIT
  ): Promise<PriceCandle[]> {
    const rows = await this.get<OkxCandleRow[]>('/api/v6/dex/market/candles', {
      chainIndex,
      tokenContractAddress: tokenAddress.toLowerCase(),
      bar,
      limit: String(limit),
    });

    return rows.map(([timestamp, open, high, low, close]) => ({
      timestamp: toNumber(timestamp),
      open: toNumber(open),
      high: toNumber(high),
      low: toNumber(low),
      close: toNumber(close),
    }));
  }

  static get scoringChains(): string {
    return SCORING_CHAINS;
  }
}
