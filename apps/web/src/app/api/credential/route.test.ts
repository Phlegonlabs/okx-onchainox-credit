import { NextResponse } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { POST } from './route';

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

function createRequest(body: unknown): Request {
  return new Request('http://localhost:3000/api/credential', {
    body: JSON.stringify(body),
    headers: {
      'content-type': 'application/json',
    },
    method: 'POST',
  });
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/credential', () => {
  it('returns the x402 middleware response when payment is missing', async () => {
    requireX402Payment.mockResolvedValue({
      ok: false,
      response: NextResponse.json(
        { error: { code: 'PAYMENT_REQUIRED', message: 'x402 payment required' } },
        { status: 402 }
      ),
    });

    const response = await POST(
      createRequest({ wallet: '0x1234567890AbcdEF1234567890aBcdef12345678' })
    );

    expect(response.status).toBe(402);
  });

  it('rejects invalid wallet payloads after a valid payment', async () => {
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

    const response = await POST(createRequest({ wallet: 'not-a-wallet' }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: 'INVALID_INPUT',
      },
    });
  });

  it('returns a signed credential for valid requests', async () => {
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
      dimensions: {
        assetScale: 72,
        multichain: 68,
        positionStability: 74,
        repaymentHistory: 81,
        walletAge: 77,
      },
      expiresAt: '2026-03-11T00:00:00.000Z',
      score: 720,
      tier: 'good',
      wallet: '0x1234567890AbcdEF1234567890aBcdef12345678',
    });
    signCredential.mockResolvedValue('0xsigned');

    const response = await POST(
      createRequest({ wallet: '0x1234567890AbcdEF1234567890aBcdef12345678' })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      issuer: 'okx-onchainos-credit',
      score: 720,
      signature: '0xsigned',
      tier: 'good',
      version: '1.0',
      wallet: '0x1234567890AbcdEF1234567890aBcdef12345678',
    });
    expect(signCredential).toHaveBeenCalledWith(
      expect.objectContaining({
        issuer: 'okx-onchainos-credit',
        score: 720,
        tier: 'good',
        wallet: '0x1234567890AbcdEF1234567890aBcdef12345678',
      })
    );
  });
});
