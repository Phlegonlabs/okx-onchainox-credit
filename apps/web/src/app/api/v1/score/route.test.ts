import { NextResponse } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from './route';

const {
  buildScoreJobSnapshot,
  checkEnterpriseRateLimit,
  createOrReuseScoreJob,
  getCachedScoreSnapshot,
  logEnterpriseApiQuery,
  logger,
  markScoreJobSettled,
  markScoreJobSettlementFailed,
  settleX402Payment,
  signCredential,
  verifyX402Payment,
} = vi.hoisted(() => ({
  buildScoreJobSnapshot: vi.fn(),
  checkEnterpriseRateLimit: vi.fn(),
  createOrReuseScoreJob: vi.fn(),
  getCachedScoreSnapshot: vi.fn(),
  logEnterpriseApiQuery: vi.fn(),
  logger: {
    error: vi.fn(),
    info: vi.fn(),
  },
  markScoreJobSettled: vi.fn(),
  markScoreJobSettlementFailed: vi.fn(),
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

vi.mock('@/lib/credit/score-cache', () => ({
  getCachedScoreSnapshot,
}));

vi.mock('@/lib/credit/score-job-service', () => ({
  buildScoreJobSnapshot,
  createOrReuseScoreJob,
  markScoreJobSettled,
  markScoreJobSettlementFailed,
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
  getCachedScoreSnapshot.mockResolvedValue({
    freshness: 'missing',
    record: null,
    walletHash: 'wallet-hash',
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
        payer: '0xpayer',
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

  it('returns a signed score immediately when fresh cache exists', async () => {
    verifyX402Payment.mockResolvedValue({
      ok: true,
      payment: {
        payer: '0xpayer',
        txHash: '0xtx',
      },
    });
    getCachedScoreSnapshot.mockResolvedValue({
      freshness: 'fresh',
      record: {
        computedAt: '2026-03-10T00:00:00.000Z',
        dimensions: {
          assetScale: 72,
          multichain: 68,
          positionStability: 74,
          repaymentHistory: 81,
          walletAge: 77,
        },
        expiresAt: '2026-03-11T00:00:00.000Z',
        score: 720,
        stale: false,
        tier: 'good',
        wallet: '',
        walletHash: 'wallet-hash',
      },
      walletHash: 'wallet-hash',
    });
    settleX402Payment.mockResolvedValue({
      ok: true,
      payment: {
        payer: '0xpayer',
        settlementId: 'settlement-1',
        txHash: '0xtx',
      },
    });
    signCredential.mockResolvedValue('0xsigned');

    const response = await GET(createRequest('0x1234567890AbcdEF1234567890aBcdef12345678'));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      score: 720,
      signature: '0xsigned',
      stale: false,
      tier: 'good',
    });
    expect(createOrReuseScoreJob).not.toHaveBeenCalled();
    expect(logEnterpriseApiQuery).toHaveBeenCalledWith({
      metadata: {
        stale: false,
      },
      payer: '0xpayer',
      resource: 'score_query',
      scoreTier: 'good',
      walletHash: expect.any(String),
      x402Tx: '0xtx',
    });
  });

  it('returns 202 processing and settles payment for cold requests', async () => {
    verifyX402Payment.mockResolvedValue({
      ok: true,
      payment: {
        payer: '0xpayer',
        txHash: '0xtx',
      },
    });
    createOrReuseScoreJob.mockResolvedValue({
      created: true,
      job: {
        id: 'job-1',
        status: 'pending',
        x402Tx: null,
      },
      jobToken: 'job-token',
    });
    settleX402Payment.mockResolvedValue({
      ok: true,
      payment: {
        payer: '0xpayer',
        settlementId: 'settlement-1',
        txHash: '0xtx',
      },
    });
    markScoreJobSettled.mockResolvedValue({
      attemptCount: 0,
      completedAt: null,
      createdAt: '2026-03-11T12:00:00.000Z',
      id: 'job-1',
      lastErrorReason: null,
      lockedAt: null,
      lockToken: null,
      nextAttemptAt: null,
      payer: '0xpayer',
      resultPayload: null,
      status: 'pending',
      statusMessage: 'Payment accepted. Preparing OKX OnchainOS collection.',
      updatedAt: '2026-03-11T12:00:00.000Z',
      walletHash: 'wallet-hash',
      x402Tx: '0xtx',
      activeKey: '0xpayer:wallet-hash',
    });
    buildScoreJobSnapshot.mockReturnValue({
      attemptCount: 0,
      jobToken: 'job-token',
      kind: 'processing',
      status: 'pending',
      statusUrl: 'http://localhost:3000/api/v1/score/jobs/job-token',
      streamUrl: 'http://localhost:3000/api/v1/score/jobs/job-token/events',
    });

    const response = await GET(createRequest('0x1234567890AbcdEF1234567890aBcdef12345678'));

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toMatchObject({
      kind: 'processing',
      jobToken: 'job-token',
      status: 'pending',
    });
    expect(markScoreJobSettled).toHaveBeenCalledWith('job-1', '0xtx');
  });

  it('marks the score job failed when settlement fails before acceptance', async () => {
    verifyX402Payment.mockResolvedValue({
      ok: true,
      payment: {
        payer: '0xpayer',
        txHash: '0xtx',
      },
    });
    createOrReuseScoreJob.mockResolvedValue({
      created: true,
      job: {
        id: 'job-1',
        status: 'pending',
        x402Tx: null,
      },
      jobToken: 'job-token',
    });
    settleX402Payment.mockResolvedValue({
      ok: false,
      response: NextResponse.json(
        { error: { code: 'INVALID_PAYMENT', message: 'invalid payment' } },
        { status: 402 }
      ),
    });
    markScoreJobSettlementFailed.mockResolvedValue(undefined);

    const response = await GET(createRequest('0x1234567890AbcdEF1234567890aBcdef12345678'));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: 'SETTLEMENT_FAILED',
      },
    });
    expect(markScoreJobSettlementFailed).toHaveBeenCalledWith('job-1');
  });
});
