import { NextResponse } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { POST } from './route';

const {
  logCredentialIssuance,
  logger,
  resolveWalletScore,
  settleX402Payment,
  signCredential,
  verifyX402Payment,
} = vi.hoisted(() => ({
  logCredentialIssuance: vi.fn(),
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

vi.mock('@/lib/credit/score-service', () => ({
  resolveWalletScore,
}));

vi.mock('@/lib/credential/signing', () => ({
  signCredential,
}));

vi.mock('@/lib/credential/audit', () => ({
  logCredentialIssuance,
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
  it('returns the x402 verification response when payment is missing', async () => {
    verifyX402Payment.mockResolvedValue({
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
    expect(verifyX402Payment).toHaveBeenCalledWith(
      expect.any(Request),
      expect.objectContaining({
        resource: 'credential_issuance',
      })
    );
  });

  it('rejects invalid wallet payloads before any payment verification occurs', async () => {
    const response = await POST(createRequest({ wallet: 'not-a-wallet' }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: 'INVALID_INPUT',
      },
    });
    expect(verifyX402Payment).not.toHaveBeenCalled();
    expect(settleX402Payment).not.toHaveBeenCalled();
  });

  it('returns a signed credential for valid requests', async () => {
    verifyX402Payment.mockResolvedValue({
      ok: true,
      payment: {
        amount: '0.50',
        chainId: 196,
        network: 'xlayer',
        payer: '0xpayer',
        raw: {},
        receipt: 'receipt',
        recipient: '0x1234567890AbcdEF1234567890aBcdef12345678',
        resource: 'credential_issuance',
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
    logCredentialIssuance.mockResolvedValue(undefined);

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
    expect(settleX402Payment).toHaveBeenCalledWith(
      expect.objectContaining({
        receipt: 'receipt',
      }),
      {
        resource: 'credential_issuance',
      }
    );
    expect(signCredential).toHaveBeenCalledWith(
      expect.objectContaining({
        issuer: 'okx-onchainos-credit',
        score: 720,
        tier: 'good',
        wallet: '0x1234567890AbcdEF1234567890aBcdef12345678',
      })
    );
    expect(logCredentialIssuance).toHaveBeenCalledWith({
      expiresAt: expect.any(Number),
      issuedAt: expect.any(Number),
      payer: '0xpayer',
      scoreTier: 'good',
      walletHash: expect.any(String),
      x402Tx: '0xtx',
    });
  });

  it('returns 500 when audit persistence fails after settlement', async () => {
    verifyX402Payment.mockResolvedValue({
      ok: true,
      payment: {
        amount: '0.50',
        chainId: 196,
        network: 'xlayer',
        payer: '0xpayer',
        raw: {},
        receipt: 'receipt',
        recipient: '0x1234567890AbcdEF1234567890aBcdef12345678',
        resource: 'credential_issuance',
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
    logCredentialIssuance.mockRejectedValue(new Error('db unavailable'));

    const response = await POST(
      createRequest({ wallet: '0x1234567890AbcdEF1234567890aBcdef12345678' })
    );

    expect(response.status).toBe(500);
  });
});
