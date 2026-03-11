import { verifyCredentialSignature } from '@/lib/credential/signing';
import { LOCAL_MOCK_PAYMENT_RECEIPT } from '@/lib/local-integration';
import { buildPaymentPayload, encodePaymentPayloadHeader } from '@/lib/x402/payload';
import { Wallet } from 'ethers';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const TEST_PRIVATE_KEY = '0x59c6995e998f97a5a0044966f0945382db2fb0f5df7e2a5d41f09be6f6c2a88b';
const TEST_SIGNER = new Wallet(TEST_PRIVATE_KEY);

const { auditInsert, auditValues, resolveWalletScore } = vi.hoisted(() => ({
  auditInsert: vi.fn(),
  auditValues: vi.fn(),
  resolveWalletScore: vi.fn(),
}));

vi.mock('@/lib/credit/score-service', () => ({
  resolveWalletScore,
}));

vi.mock('@/lib/db', () => ({
  db: {
    insert: auditInsert,
  },
  schema: {
    auditLog: 'audit_log',
  },
}));

const { POST } = await import('./route');

const ORIGINAL_FETCH = globalThis.fetch;

function createRequest(wallet: string, paymentSignature?: string): Request {
  return new Request('http://localhost:3000/api/credential', {
    body: JSON.stringify({ wallet }),
    headers: {
      'content-type': 'application/json',
      ...(paymentSignature ? { 'payment-signature': paymentSignature } : {}),
    },
    method: 'POST',
  });
}

function configureEnv() {
  process.env.ECDSA_PRIVATE_KEY = TEST_PRIVATE_KEY;
  process.env.ECDSA_PUBLIC_ADDRESS = TEST_SIGNER.address;
  process.env.OKX_API_KEY = 'okx-key';
  process.env.OKX_SECRET_KEY = 'okx-secret';
  process.env.OKX_PASSPHRASE = 'okx-pass';
  process.env.OKX_BASE_URL = 'https://web3.okx.com';
  process.env.X402_RECIPIENT_ADDRESS = '0x1234567890AbcdEF1234567890aBcdef12345678';
  process.env.X402_USDC_ADDRESS = '0x74b7f16337b8972027f6196a17a631ac6de26d22';
  process.env.X402_PAYMENT_TOKEN = 'USDC';
  process.env.X402_CHAIN_ID = '196';
  process.env.X402_NETWORK = 'xlayer';
}

function createSignedPaymentHeader() {
  return encodePaymentPayloadHeader(
    buildPaymentPayload({
      authorization: {
        from: '0xpayer',
        nonce: `0x${'2'.repeat(64)}`,
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

function mockSuccessfulPaymentLifecycle() {
  globalThis.fetch = vi
    .fn()
    .mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url =
        typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

      if (url.endsWith('/api/v6/x402/verify')) {
        const body = JSON.parse(String(init?.body ?? '{}'));

        expect(body).toMatchObject({
          chainIndex: '196',
          x402Version: 1,
        });

        return new Response(
          JSON.stringify({
            code: '0',
            data: [
              {
                isValid: true,
                payerAddress: '0xpayer',
                txHash: '0xtx',
              },
            ],
            msg: '',
          }),
          {
            headers: {
              'content-type': 'application/json',
            },
            status: 200,
          }
        );
      }

      if (url.endsWith('/api/v6/x402/settle')) {
        const body = JSON.parse(String(init?.body ?? '{}'));

        expect(body).toMatchObject({
          chainIndex: '196',
          x402Version: 1,
        });

        return new Response(
          JSON.stringify({
            code: '0',
            data: [
              {
                isSettled: true,
                payerAddress: '0xpayer',
                settlementId: 'settlement-1',
                txHash: '0xtx',
              },
            ],
            msg: '',
          }),
          {
            headers: {
              'content-type': 'application/json',
            },
            status: 200,
          }
        );
      }

      throw new Error(`Unexpected fetch target: ${url}`);
    }) as typeof fetch;
}

beforeEach(() => {
  configureEnv();
  auditValues.mockResolvedValue(undefined);
  auditInsert.mockReturnValue({ values: auditValues });
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
});

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
  vi.clearAllMocks();
});

describe('POST /api/credential integration', () => {
  it('returns 402 payment requirements when no payment header is present', async () => {
    const response = await POST(createRequest('0x1234567890AbcdEF1234567890aBcdef12345678'));

    expect(response.status).toBe(402);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: 'PAYMENT_REQUIRED',
      },
      paymentRequired: {
        chainId: 196,
        network: 'xlayer',
        token: 'USDC',
      },
    });
  });

  it('returns 400 before touching the payment network when the wallet is invalid', async () => {
    globalThis.fetch = vi.fn() as typeof fetch;

    const response = await POST(createRequest('not-a-wallet', 'signed-receipt'));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: 'INVALID_INPUT',
      },
    });
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('returns a signed credential and writes an audit row for valid paid requests', async () => {
    mockSuccessfulPaymentLifecycle();

    const response = await POST(
      createRequest('0x1234567890AbcdEF1234567890aBcdef12345678', createSignedPaymentHeader())
    );

    expect(response.status).toBe(200);
    const credential = (await response.json()) as Record<string, unknown>;

    expect(credential).toMatchObject({
      issuer: 'okx-onchainos-credit',
      score: 720,
      tier: 'good',
      version: '1.0',
      wallet: '0x1234567890AbcdEF1234567890aBcdef12345678',
    });
    expect(typeof credential.signature).toBe('string');
    await expect(
      verifyCredentialSignature(
        {
          dimensions: credential.dimensions,
          expiresAt: credential.expiresAt,
          issuedAt: credential.issuedAt,
          issuer: credential.issuer,
          score: credential.score,
          tier: credential.tier,
          version: credential.version,
          wallet: credential.wallet,
        },
        String(credential.signature),
        TEST_SIGNER.address
      )
    ).resolves.toBe(true);

    expect(auditInsert).toHaveBeenCalledWith('audit_log');
    expect(auditValues).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'credential_issued',
        payer: '0xpayer',
        scoreTier: 'good',
        x402Tx: '0xtx',
      })
    );
  });

  it('supports credential issuance in local mock mode without calling the live payment network', async () => {
    process.env.LOCAL_INTEGRATION_MODE = 'mock';
    globalThis.fetch = vi.fn() as typeof fetch;

    const response = await POST(
      createRequest('0x1234567890AbcdEF1234567890aBcdef12345678', LOCAL_MOCK_PAYMENT_RECEIPT)
    );

    expect(response.status).toBe(200);
    const credential = (await response.json()) as Record<string, unknown>;

    expect(credential).toMatchObject({
      issuer: 'okx-onchainos-credit',
      score: 720,
      tier: 'good',
      version: '1.0',
      wallet: '0x1234567890AbcdEF1234567890aBcdef12345678',
    });
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(auditValues).toHaveBeenCalledWith(
      expect.objectContaining({
        payer: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
        x402Tx: '0xlocalmocktx',
      })
    );
  });
});
