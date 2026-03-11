import { NextResponse } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from './route';

const {
  checkEnterpriseRateLimit,
  logEnterpriseApiQuery,
  logger,
  resolveWalletScore,
  settleX402Payment,
  signCredential,
  verifyX402Payment,
} = vi.hoisted(() => ({
  checkEnterpriseRateLimit: vi.fn(),
  logEnterpriseApiQuery: vi.fn(),
  logger: {
    error: vi.fn(),
    info: vi.fn(),
  },
  resolveWalletScore: vi.fn(),
  settleX402Payment: vi.fn(),
  signCredential: vi.fn(),
  verifyX402Payment: vi.fn(),
}));

vi.mock('@/lib/x402', () => ({
  settleX402Payment,
  verifyX402Payment,
}));

vi.mock('@/lib/enterprise/rate-limit', () => ({
  checkEnterpriseRateLimit,
}));

vi.mock('@/lib/enterprise/audit', () => ({
  logEnterpriseApiQuery,
}));

vi.mock('@/lib/credit/score-service', () => ({
  resolveWalletScore,
}));

vi.mock('@/lib/credential/signing', () => ({
  signCredential,
}));

vi.mock('@/lib/logger', () => ({
  logger,
}));

function createRequest(wallet?: string): Request {
  const url = new URL('http://localhost:3000/api/v1/score');

  if (wallet) {
    url.searchParams.set('wallet', wallet);
  }

  return new Request(url, {
    method: 'GET',
  });
}

afterEach(() => {
  vi.clearAllMocks();
});

beforeEach(() => {
  checkEnterpriseRateLimit.mockResolvedValue({
    ok: true,
    requestCount: 1,
  });
  logEnterpriseApiQuery.mockResolvedValue(undefined);
});

describe('GET /api/v1/score', () => {
  it('returns the x402 verification response when payment is missing', async () => {
    verifyX402Payment.mockResolvedValue({
      ok: false,
      response: NextResponse.json(
        { error: { code: 'PAYMENT_REQUIRED', message: 'x402 payment required' } },
        { status: 402 }
      ),
    });

    const response = await GET(createRequest('0x1234567890AbcdEF1234567890aBcdef12345678'));

    expect(response.status).toBe(402);
    expect(verifyX402Payment).toHaveBeenCalledWith(
      expect.any(Request),
      expect.objectContaining({
        amountUsd: '0.10',
        resource: 'score_query',
      })
    );
  });

  it('rejects invalid wallet query params before payment verification occurs', async () => {
    const response = await GET(createRequest('not-a-wallet'));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: 'INVALID_INPUT',
      },
    });
    expect(verifyX402Payment).not.toHaveBeenCalled();
    expect(settleX402Payment).not.toHaveBeenCalled();
  });

  it('returns 429 when the payer exceeds the enterprise rate limit without settling the payment', async () => {
    verifyX402Payment.mockResolvedValue({
      ok: true,
      payment: {
        amount: '0.10',
        chainId: 196,
        network: 'xlayer',
        payer: '0xpayer',
        raw: {},
        receipt: 'receipt',
        recipient: '0x1234567890AbcdEF1234567890aBcdef12345678',
        resource: 'score_query',
        token: 'USDC',
        tokenAddress: '0x74b7f16337b8972027f6196a17a631ac6de26d22',
        txHash: '0xtx',
      },
    });
    checkEnterpriseRateLimit.mockResolvedValue({
      error: {
        code: 'RATE_LIMITED',
        details: {
          limit: 100,
          retryAfterSeconds: 60,
          windowSeconds: 60,
        },
        message: 'Enterprise API rate limit exceeded.',
        statusCode: 429,
      },
      ok: false,
      retryAfterSeconds: 60,
    });

    const response = await GET(createRequest('0x1234567890AbcdEF1234567890aBcdef12345678'));

    expect(response.status).toBe(429);
    expect(response.headers.get('retry-after')).toBe('60');
    expect(settleX402Payment).not.toHaveBeenCalled();
  });

  it('returns a signed score payload for valid requests', async () => {
    verifyX402Payment.mockResolvedValue({
      ok: true,
      payment: {
        amount: '0.10',
        chainId: 196,
        network: 'xlayer',
        payer: '0xpayer',
        raw: {},
        receipt: 'receipt',
        recipient: '0x1234567890AbcdEF1234567890aBcdef12345678',
        resource: 'score_query',
        token: 'USDC',
        tokenAddress: '0x74b7f16337b8972027f6196a17a631ac6de26d22',
        txHash: '0xtx',
      },
    });
    settleX402Payment.mockResolvedValue({
      ok: true,
      payment: {
        payer: '0xpayer',
        raw: {},
        receipt: 'receipt',
        settlementId: 'settlement-1',
        txHash: '0xtx',
      },
    });
    resolveWalletScore.mockResolvedValue({
      computedAt: '2026-03-10T00:00:00.000Z',
      dataGaps: ['no_defi_history'],
      dimensions: {
        assetScale: 72,
        multichain: 68,
        positionStability: 74,
        repaymentHistory: 81,
        walletAge: 77,
      },
      expiresAt: '2026-03-11T00:00:00.000Z',
      score: 720,
      stale: true,
      tier: 'good',
      wallet: '0x1234567890AbcdEF1234567890aBcdef12345678',
    });
    signCredential.mockResolvedValue('0xsigned');

    const response = await GET(createRequest('0x1234567890AbcdEF1234567890aBcdef12345678'));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      breakdown: {
        assetScale: 72,
        multichain: 68,
        positionStability: 74,
        repaymentHistory: 81,
        walletAge: 77,
      },
      issuer: 'okx-onchainos-credit',
      score: 720,
      signature: '0xsigned',
      stale: true,
      tier: 'good',
      version: '1.0',
      wallet: '0x1234567890AbcdEF1234567890aBcdef12345678',
    });
    expect(settleX402Payment).toHaveBeenCalledWith(
      expect.objectContaining({
        receipt: 'receipt',
      }),
      {
        amountUsd: '0.10',
        resource: 'score_query',
      }
    );
    expect(logEnterpriseApiQuery).toHaveBeenCalledWith({
      metadata: {
        stale: true,
      },
      payer: '0xpayer',
      resource: 'score_query',
      scoreTier: 'good',
      walletHash: expect.any(String),
      x402Tx: '0xtx',
    });
    expect(signCredential).toHaveBeenCalledWith({
      breakdown: {
        assetScale: 72,
        multichain: 68,
        positionStability: 74,
        repaymentHistory: 81,
        walletAge: 77,
      },
      computedAt: '2026-03-10T00:00:00.000Z',
      dataGaps: ['no_defi_history'],
      expiresAt: '2026-03-11T00:00:00.000Z',
      issuer: 'okx-onchainos-credit',
      score: 720,
      stale: true,
      tier: 'good',
      version: '1.0',
      wallet: '0x1234567890AbcdEF1234567890aBcdef12345678',
    });
  });

  it('returns 500 when score retrieval fails after settlement', async () => {
    verifyX402Payment.mockResolvedValue({
      ok: true,
      payment: {
        amount: '0.10',
        chainId: 196,
        network: 'xlayer',
        payer: '0xpayer',
        raw: {},
        receipt: 'receipt',
        recipient: '0x1234567890AbcdEF1234567890aBcdef12345678',
        resource: 'score_query',
        token: 'USDC',
        tokenAddress: '0x74b7f16337b8972027f6196a17a631ac6de26d22',
        txHash: '0xtx',
      },
    });
    settleX402Payment.mockResolvedValue({
      ok: true,
      payment: {
        payer: '0xpayer',
        raw: {},
        receipt: 'receipt',
        settlementId: 'settlement-1',
        txHash: '0xtx',
      },
    });
    resolveWalletScore.mockRejectedValue(new Error('okx unavailable'));

    const response = await GET(createRequest('0x1234567890AbcdEF1234567890aBcdef12345678'));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: 'SCORE_QUERY_FAILED',
      },
    });
  });
});
