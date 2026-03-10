import { NextResponse } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET } from './route';

const { logger, requireX402Payment, verifyCredentialSignature } = vi.hoisted(() => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
  },
  requireX402Payment: vi.fn(),
  verifyCredentialSignature: vi.fn(),
}));

vi.mock('@/lib/x402', () => ({
  requireX402Payment,
}));

vi.mock('@/lib/credential/signing', () => ({
  verifyCredentialSignature,
}));

vi.mock('@/lib/logger', () => ({
  logger,
}));

function createCredential() {
  return {
    dimensions: {
      assetScale: 72,
      multichain: 68,
      positionStability: 74,
      repaymentHistory: 81,
      walletAge: 77,
    },
    expiresAt: 1775692800,
    issuedAt: 1773100800,
    issuer: 'okx-onchainos-credit',
    score: 720,
    signature: '0xsigned',
    tier: 'good',
    version: '1.0',
    wallet: '0x1234567890AbcdEF1234567890aBcdef12345678',
  };
}

function createRequest(credential?: unknown): Request {
  const url = new URL('http://localhost:3000/api/v1/credential/verify');

  if (credential !== undefined) {
    url.searchParams.set(
      'credential',
      typeof credential === 'string' ? credential : JSON.stringify(credential)
    );
  }

  return new Request(url, {
    method: 'GET',
  });
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/v1/credential/verify', () => {
  it('returns the x402 middleware response when payment is missing', async () => {
    requireX402Payment.mockResolvedValue({
      ok: false,
      response: NextResponse.json(
        { error: { code: 'PAYMENT_REQUIRED', message: 'x402 payment required' } },
        { status: 402 }
      ),
    });

    const response = await GET(createRequest(createCredential()));

    expect(response.status).toBe(402);
    expect(requireX402Payment).toHaveBeenCalledWith(
      expect.any(Request),
      expect.objectContaining({
        amountUsd: '0.10',
        resource: 'credential_verification',
      })
    );
  });

  it('rejects malformed credential query values', async () => {
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

    const response = await GET(createRequest('{invalid'));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: 'INVALID_INPUT',
      },
    });
  });

  it('returns the credential summary with valid=true when the signature matches', async () => {
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
    verifyCredentialSignature.mockResolvedValue(true);

    const response = await GET(createRequest(createCredential()));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      expiresAt: 1775692800,
      score: 720,
      valid: true,
      wallet: '0x1234567890AbcdEF1234567890aBcdef12345678',
    });
  });

  it('returns valid=false when the signature does not match', async () => {
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
    verifyCredentialSignature.mockResolvedValue(false);

    const response = await GET(createRequest(createCredential()));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      valid: false,
    });
  });

  it('returns 500 when verification throws unexpectedly', async () => {
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
    verifyCredentialSignature.mockRejectedValue(new Error('signer unavailable'));

    const response = await GET(createRequest(createCredential()));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: 'CREDENTIAL_VERIFICATION_FAILED',
      },
    });
  });
});
