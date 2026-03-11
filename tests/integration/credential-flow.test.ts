import { buildPaymentPayload, encodePaymentPayloadHeader } from '@/lib/x402/payload';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { fromEnv, logCredentialIssuance, resolveWalletScore, signCredential } = vi.hoisted(() => ({
  fromEnv: vi.fn(),
  logCredentialIssuance: vi.fn(),
  resolveWalletScore: vi.fn(),
  signCredential: vi.fn(),
}));

vi.mock('@/lib/x402/client', () => ({
  OkxX402Client: {
    fromEnv,
  },
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

function configureX402Env() {
  process.env.X402_CREDENTIAL_PRICE_USD = '0.50';
  process.env.X402_NETWORK = 'xlayer';
  process.env.X402_PAYMENT_TOKEN = 'USDC';
  process.env.X402_RECIPIENT_ADDRESS = '0x1234567890AbcdEF1234567890aBcdef12345678';
  process.env.X402_USDC_ADDRESS = '0x74b7f16337b8972027f6196a17a631ac6de26d22';
}

function createSignedPaymentHeader() {
  return encodePaymentPayloadHeader(
    buildPaymentPayload({
      authorization: {
        from: '0xpayer',
        nonce: `0x${'3'.repeat(64)}`,
        to: '0x1234567890AbcdEF1234567890aBcdef12345678',
        validAfter: '0',
        validBefore: '9999999999',
        value: '500000',
      },
      chainId: 196,
      signature: '0xsignedpayload',
    })
  );
}

function createRequest(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request('http://localhost:3000/api/credential', {
    body: JSON.stringify(body),
    headers: {
      'content-type': 'application/json',
      ...headers,
    },
    method: 'POST',
  });
}

describe('credential issuance flow', () => {
  beforeEach(() => {
    configureX402Env();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns 402 payment requirements when payment is missing', async () => {
    const { POST } = await import('@/app/api/credential/route');

    const response = await POST(
      createRequest({ wallet: '0x1234567890AbcdEF1234567890aBcdef12345678' })
    );

    expect(response.status).toBe(402);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: 'PAYMENT_REQUIRED',
      },
      paymentRequired: {
        amount: '0.50',
        chainId: 196,
        header: 'Payment-Signature',
        network: 'xlayer',
        resource: 'credential_issuance',
        token: 'USDC',
      },
    });
  });

  it('returns 400 for invalid wallet payloads before touching the payment client', async () => {
    const { POST } = await import('@/app/api/credential/route');
    const response = await POST(
      createRequest(
        { wallet: 'not-a-wallet' },
        { 'payment-signature': createSignedPaymentHeader() }
      )
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: 'INVALID_INPUT',
      },
    });
    expect(fromEnv).not.toHaveBeenCalled();
  });

  it('returns a signed credential for verified and settled payments', async () => {
    fromEnv.mockReturnValue({
      verifyPayment: vi.fn().mockResolvedValue({
        invalidReason: null,
        isValid: true,
        payer: '0xpayer',
        paymentPayload: buildPaymentPayload({
          authorization: {
            from: '0xpayer',
            nonce: `0x${'4'.repeat(64)}`,
            to: '0x1234567890AbcdEF1234567890aBcdef12345678',
            validAfter: '0',
            validBefore: '9999999999',
            value: '500000',
          },
          chainId: 196,
          signature: '0xsignedpayload',
        }),
        paymentRequirements: {
          asset: '0x74b7f16337b8972027f6196a17a631ac6de26d22',
          chainIndex: '196',
          extra: {
            decimals: 6,
            domainName: 'USD Coin',
            domainVersion: '2',
            gasLimit: '1000000',
            token: 'USDC',
          },
          maxAmountRequired: '500000',
          maxTimeoutSeconds: 600,
          mimeType: 'application/json',
          payTo: '0x1234567890AbcdEF1234567890aBcdef12345678',
          resource: 'http://localhost:3000/api/credential',
          scheme: 'exact',
          x402Version: 1,
        },
        raw: {},
        txHash: '0xtx',
      }),
      settlePayment: vi.fn().mockResolvedValue({
        invalidReason: null,
        payer: '0xpayer',
        paymentPayload: buildPaymentPayload({
          authorization: {
            from: '0xpayer',
            nonce: `0x${'4'.repeat(64)}`,
            to: '0x1234567890AbcdEF1234567890aBcdef12345678',
            validAfter: '0',
            validBefore: '9999999999',
            value: '500000',
          },
          chainId: 196,
          signature: '0xsignedpayload',
        }),
        raw: {},
        settlementId: 'settlement-1',
        success: true,
        txHash: '0xtx',
      }),
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

    const { POST } = await import('@/app/api/credential/route');
    const response = await POST(
      createRequest(
        { wallet: '0x1234567890AbcdEF1234567890aBcdef12345678' },
        { 'payment-signature': createSignedPaymentHeader() }
      )
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
  });
});
