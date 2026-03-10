import { createHmac } from 'node:crypto';

const DEFAULT_OKX_BASE_URL = process.env.OKX_BASE_URL ?? 'https://web3.okx.com';
const DEFAULT_TIMEOUT_MS = 3_000;

interface OkxApiEnvelope<T> {
  code: string;
  data: T;
  msg: string;
}

interface OkxX402ClientConfig {
  apiKey: string;
  baseUrl?: string;
  passphrase: string;
  secretKey: string;
  timeoutMs?: number;
}

export interface X402PaymentSettlement {
  payer: string | null;
  raw: unknown;
  receipt: string;
  settlementId: string | null;
  txHash: string | null;
}

export interface X402Client {
  settlePayment(receipt: string): Promise<X402PaymentSettlement>;
}

function readString(source: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function unwrapOkxResult(value: unknown): Record<string, unknown> {
  if (Array.isArray(value) && value[0] && typeof value[0] === 'object') {
    return value[0] as Record<string, unknown>;
  }

  if (value && typeof value === 'object') {
    return value as Record<string, unknown>;
  }

  return {};
}

export class OkxX402Client implements X402Client {
  private config: Required<OkxX402ClientConfig>;

  constructor(config: OkxX402ClientConfig) {
    this.config = {
      baseUrl: DEFAULT_OKX_BASE_URL,
      timeoutMs: DEFAULT_TIMEOUT_MS,
      ...config,
    };
  }

  static fromEnv(): OkxX402Client {
    const apiKey = process.env.OKX_API_KEY?.trim();
    const secretKey = process.env.OKX_SECRET_KEY?.trim();
    const passphrase = process.env.OKX_PASSPHRASE?.trim();

    if (!apiKey || !secretKey || !passphrase) {
      throw new Error('OKX_API_KEY, OKX_SECRET_KEY, and OKX_PASSPHRASE must be configured');
    }

    return new OkxX402Client({ apiKey, passphrase, secretKey });
  }

  private buildHeaders(method: string, path: string, body = ''): Record<string, string> {
    const timestamp = new Date().toISOString();
    const prehash = timestamp + method.toUpperCase() + path + body;
    const sign = createHmac('sha256', this.config.secretKey).update(prehash).digest('base64');

    return {
      'Content-Type': 'application/json',
      'OK-ACCESS-KEY': this.config.apiKey,
      'OK-ACCESS-PASSPHRASE': this.config.passphrase,
      'OK-ACCESS-SIGN': sign,
      'OK-ACCESS-TIMESTAMP': timestamp,
    };
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    const serializedBody = JSON.stringify(body);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await fetch(`${this.config.baseUrl}${path}`, {
        body: serializedBody,
        headers: this.buildHeaders('POST', path, serializedBody),
        method: 'POST',
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`OKX x402 API error: ${response.status} ${response.statusText}`);
      }

      const json = (await response.json()) as OkxApiEnvelope<T>;
      if (json.code !== '0') {
        throw new Error(`OKX x402 API error: ${json.msg}`);
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
  }

  async settlePayment(receipt: string): Promise<X402PaymentSettlement> {
    const data = await this.post<unknown>('/api/v6/wallet/payments/settle', { receipt });
    const record = unwrapOkxResult(data);

    return {
      payer: readString(record, ['payer', 'payerAddress', 'fromAddress']),
      raw: data,
      receipt,
      settlementId: readString(record, ['settlementId', 'paymentId', 'id']),
      txHash: readString(record, ['txHash', 'paymentTxHash', 'transactionHash']),
    };
  }
}
