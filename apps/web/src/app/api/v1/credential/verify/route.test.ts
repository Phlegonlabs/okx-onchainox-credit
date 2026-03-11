import { NextResponse } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from './route';

const {
  checkEnterpriseRateLimit,
  logEnterpriseApiQuery,
  logger,
  settleX402Payment,
  verifyCredentialSignature,
  verifyX402Payment,
} = vi.hoisted(() => ({
  checkEnterpriseRateLimit: vi.fn(),
  logEnterpriseApiQuery: vi.fn(),
  logger: {
    error: vi.fn(),
    info: vi.fn(),
  },
  settleX402Payment: vi.fn(),
  verifyCredentialSignature: vi.fn(),
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

beforeEach(() => {
  checkEnterpriseRateLimit.mockResolvedValue({
    ok: true,
    requestCount: 1,
  });
  logEnterpriseApiQuery.mockResolvedValue(undefined);
});

describe('GET /api/v1/credential/verify', () => {
  it('returns the x402 verification response when payment is missing', async () => {
    verifyX402Payment.mockResolvedValue({
      ok: false,
      response: NextResponse.json(
        { error: { code: 'PAYMENT_REQUIRED', message: 'x402 payment required' } },
        { status: 402 }
      ),
    });

    const response = await GET(createRequest(createCredential()));

    expect(response.status).toBe(402);
    expect(verifyX402Payment).toHaveBeenCalledWith(
      expect.any(Request),
      expect.objectContaining({
        amountUsd: '0.10',
        resource: 'credential_verification',
      })
    );
  });

  it('rejects malformed credential query values before payment verification occurs', async () => {
    const response = await GET(createRequest('{invalid'));

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
        resource: 'credential_verification',
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

    const response = await GET(createRequest(createCredential()));

    expect(response.status).toBe(429);
    expect(response.headers.get('retry-after')).toBe('60');
    expect(settleX402Payment).not.toHaveBeenCalled();
  });

  it('returns the credential summary with valid=true when the signature matches', async () => {
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
        resource: 'credential_verification',
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
    verifyCredentialSignature.mockResolvedValue(true);

    const response = await GET(createRequest(createCredential()));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      expiresAt: 1775692800,
      score: 720,
      valid: true,
      wallet: '0x1234567890AbcdEF1234567890aBcdef12345678',
    });
    expect(settleX402Payment).toHaveBeenCalledWith(
      expect.objectContaining({
        receipt: 'receipt',
      }),
      {
        amountUsd: '0.10',
        resource: 'credential_verification',
      }
    );
    expect(logEnterpriseApiQuery).toHaveBeenCalledWith({
      metadata: {
        expiresAt: 1775692800,
        valid: true,
      },
      payer: '0xpayer',
      resource: 'credential_verification',
      scoreTier: 'good',
      walletHash: expect.any(String),
      x402Tx: '0xtx',
    });
    const verificationCallOrder = verifyCredentialSignature.mock.invocationCallOrder[0];
    const settleCallOrder = settleX402Payment.mock.invocationCallOrder[0];
    if (verificationCallOrder === undefined || settleCallOrder === undefined) {
      throw new Error('Expected verification and settlement to both run');
    }
    expect(verificationCallOrder).toBeLessThan(settleCallOrder);
  });

  it('returns valid=false when the signature does not match', async () => {
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
        resource: 'credential_verification',
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
    verifyCredentialSignature.mockResolvedValue(false);

    const response = await GET(createRequest(createCredential()));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      valid: false,
    });
  });

  it('continues verification when the rate-limit store throws', async () => {
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
        resource: 'credential_verification',
        token: 'USDC',
        tokenAddress: '0x74b7f16337b8972027f6196a17a631ac6de26d22',
        txHash: '0xtx',
      },
    });
    checkEnterpriseRateLimit.mockRejectedValue(new Error('api_rate_limits missing'));
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
    verifyCredentialSignature.mockResolvedValue(true);

    const response = await GET(createRequest(createCredential()));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      valid: true,
    });
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ operation: 'api.credential.verify.rate_limit' }),
      'credential verification rate limit check failed; allowing paid query'
    );
  });

  it('returns 500 without settling when verification throws unexpectedly', async () => {
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
        resource: 'credential_verification',
        token: 'USDC',
        tokenAddress: '0x74b7f16337b8972027f6196a17a631ac6de26d22',
        txHash: '0xtx',
      },
    });
    verifyCredentialSignature.mockRejectedValue(new Error('ECDSA_RECOVER_FAILED'));

    const response = await GET(createRequest(createCredential()));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: 'CREDENTIAL_VERIFICATION_FAILED',
        details: {
          reason: 'signer_unavailable',
        },
      },
    });
    expect(settleX402Payment).not.toHaveBeenCalled();
  });

  it('continues serving the verification result when audit persistence fails', async () => {
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
        resource: 'credential_verification',
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
    verifyCredentialSignature.mockResolvedValue(true);
    logEnterpriseApiQuery.mockRejectedValue(new Error('audit_log missing'));

    const response = await GET(createRequest(createCredential()));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      valid: true,
    });
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ operation: 'api.credential.verify.audit' }),
      'credential verification audit log failed'
    );
  });
});
