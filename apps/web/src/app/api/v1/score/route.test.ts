import { NextResponse } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET } from './route';

const { logger, requireX402Payment, resolveWalletScore, signCredential } = vi.hoisted(() => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
  },
  requireX402Payment: vi.fn(),
  resolveWalletScore: vi.fn(),
  signCredential: vi.fn(),
}));

vi.mock('@/lib/x402', () => ({
  requireX402Payment,
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

describe('GET /api/v1/score', () => {
  it('returns the x402 middleware response when payment is missing', async () => {
    requireX402Payment.mockResolvedValue({
      ok: false,
      response: NextResponse.json(
        { error: { code: 'PAYMENT_REQUIRED', message: 'x402 payment required' } },
        { status: 402 }
      ),
    });

    const response = await GET(createRequest('0x1234567890AbcdEF1234567890aBcdef12345678'));

    expect(response.status).toBe(402);
    expect(requireX402Payment).toHaveBeenCalledWith(
      expect.any(Request),
      expect.objectContaining({
        amountUsd: '0.10',
        resource: 'score_query',
      })
    );
  });

  it('rejects invalid wallet query params after a valid payment', async () => {
    requireX402Payment.mockResolvedValue({
      ok: true,
      payment: {
        payer: '0xpayer',
        raw: {},
        receipt: 'receipt',
        settlementId: 'settlement-1',
        txHash: '0xtx',
      },
    });

    const response = await GET(createRequest('not-a-wallet'));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: 'INVALID_INPUT',
      },
    });
  });

  it('returns a signed score payload for valid requests', async () => {
    requireX402Payment.mockResolvedValue({
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

  it('returns 500 when score retrieval fails', async () => {
    requireX402Payment.mockResolvedValue({
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
