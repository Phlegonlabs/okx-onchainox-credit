import { createHmac } from 'node:crypto';
import type { X402PaymentPayload, X402PaymentRequirements } from './payload';
import { normalizeX402RetryDelays, retryX402Request } from './retry';

const DEFAULT_OKX_BASE_URL = process.env.OKX_BASE_URL ?? 'https://web3.okx.com';
const DEFAULT_TIMEOUT_MS = 3_000;
const OKX_X402_SETTLE_PATH = '/api/v6/x402/settle';
const OKX_X402_VERIFY_PATH = '/api/v6/x402/verify';

interface OkxApiEnvelope<T> {
  code: string;
  data: T;
  msg: string;
}

interface OkxX402ClientConfig {
  apiKey: string;
  baseUrl?: string;
  passphrase: string;
  retryDelaysMs?: number[];
  secretKey: string;
  timeoutMs?: number;
}

export interface X402PaymentVerification {
  invalidReason: string | null;
  isValid: boolean;
  payer: string | null;
  paymentPayload: X402PaymentPayload;
  paymentRequirements: X402PaymentRequirements;
  raw: unknown;
  txHash: string | null;
}

export interface X402PaymentSettlement {
  invalidReason: string | null;
  payer: string | null;
  paymentPayload: X402PaymentPayload;
  raw: unknown;
  settlementId: string | null;
  success: boolean;
  txHash: string | null;
}

export interface X402Client {
  settlePayment(
    paymentPayload: X402PaymentPayload,
    paymentRequirements: X402PaymentRequirements
  ): Promise<X402PaymentSettlement>;
  verifyPayment(
    paymentPayload: X402PaymentPayload,
    paymentRequirements: X402PaymentRequirements
  ): Promise<X402PaymentVerification>;
}

function readBoolean(source: Record<string, unknown>, keys: string[]): boolean | null {
  for (const key of keys) {
    const value = source[key];

    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (normalized === 'true') {
        return true;
      }

      if (normalized === 'false') {
        return false;
      }
    }
  }

  return null;
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

function isRejectedVerification(record: Record<string, unknown>): boolean {
  const verificationFlag = readBoolean(record, ['verified', 'valid']);
  if (verificationFlag === false) {
    return true;
  }

  const status = readString(record, ['status', 'verificationStatus'])?.toLowerCase();
  return status === 'failed' || status === 'invalid' || status === 'rejected';
}

function buildX402RequestBody(
  paymentPayload: X402PaymentPayload,
  paymentRequirements: X402PaymentRequirements
) {
  return {
    chainIndex: paymentPayload.chainIndex,
    paymentPayload,
    paymentRequirements,
    x402Version: paymentPayload.x402Version,
  };
}

export class OkxX402Client implements X402Client {
  private config: Required<OkxX402ClientConfig>;

  constructor(config: OkxX402ClientConfig) {
    this.config = {
      baseUrl: DEFAULT_OKX_BASE_URL,
      retryDelaysMs: normalizeX402RetryDelays(config.retryDelaysMs),
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
    return retryX402Request(async () => {
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
    }, this.config.retryDelaysMs);
  }

  async verifyPayment(
    paymentPayload: X402PaymentPayload,
    paymentRequirements: X402PaymentRequirements
  ): Promise<X402PaymentVerification> {
    const data = await this.post<unknown>(
      OKX_X402_VERIFY_PATH,
      buildX402RequestBody(paymentPayload, paymentRequirements)
    );
    const record = unwrapOkxResult(data);

    const isValid =
      readBoolean(record, ['isValid', 'verified', 'valid']) ?? !isRejectedVerification(record);
    const invalidReason = readString(record, [
      'errorReason',
      'invalidReason',
      'reason',
      'message',
      'errorMsg',
    ]);

    return {
      invalidReason,
      isValid,
      payer: readString(record, ['payer', 'payerAddress', 'fromAddress']),
      paymentPayload,
      paymentRequirements,
      raw: data,
      txHash: readString(record, ['txHash', 'paymentTxHash', 'transactionHash']),
    };
  }

  async settlePayment(
    paymentPayload: X402PaymentPayload,
    paymentRequirements: X402PaymentRequirements
  ): Promise<X402PaymentSettlement> {
    const data = await this.post<unknown>(
      OKX_X402_SETTLE_PATH,
      buildX402RequestBody(paymentPayload, paymentRequirements)
    );
    const record = unwrapOkxResult(data);

    return {
      invalidReason: readString(record, [
        'errorReason',
        'invalidReason',
        'reason',
        'message',
        'errorMsg',
      ]),
      payer: readString(record, ['payer', 'payerAddress', 'fromAddress']),
      paymentPayload,
      raw: data,
      settlementId: readString(record, ['settlementId', 'paymentId', 'id']),
      success: readBoolean(record, ['success', 'settled', 'isSettled']) ?? true,
      txHash: readString(record, ['txHash', 'paymentTxHash', 'transactionHash']),
    };
  }
}
