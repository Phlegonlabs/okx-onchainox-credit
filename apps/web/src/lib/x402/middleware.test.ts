import { LOCAL_MOCK_PAYMENT_RECEIPT } from '@/lib/local-integration';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { settleX402Payment, verifyX402Payment } from './middleware';

const TEST_CONFIG = {
  chainId: 196,
  network: 'xlayer',
  recipient: '0x1234567890AbcdEF1234567890aBcdef12345678',
  token: 'USDC' as const,
  tokenAddress: '0x74b7f16337b8972027f6196a17a631ac6de26d22',
};

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('verifyX402Payment', () => {
  it('returns a 402 response with payment requirements when the receipt header is missing', async () => {
    const result = await verifyX402Payment(new Request('http://localhost:3000/api/credential'), {
      amountUsd: '0.50',
      config: TEST_CONFIG,
      resource: 'credential_issuance',
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error('expected payment to be rejected');
    }

    expect(result.response.status).toBe(402);
    await expect(result.response.json()).resolves.toMatchObject({
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
        tokenAddress: TEST_CONFIG.tokenAddress,
      },
    });
  });

  it('allows requests with a verified receipt that matches the requested terms', async () => {
    const client = {
      settlePayment: vi.fn(),
      verifyPayment: vi.fn().mockResolvedValue({
        amount: '0.50',
        chainId: 196,
        network: 'xlayer',
        payer: '0x4567890AbcdEF1234567890aBcdef1234567890',
        raw: { status: 'verified' },
        receipt: 'signed-receipt',
        recipient: TEST_CONFIG.recipient,
        resource: 'credential_issuance',
        token: 'USDC',
        tokenAddress: TEST_CONFIG.tokenAddress,
        txHash: '0xtxhash',
      }),
    };

    const result = await verifyX402Payment(
      new Request('http://localhost:3000/api/credential', {
        headers: {
          'payment-signature': 'signed-receipt',
        },
      }),
      {
        amountUsd: '0.50',
        client,
        config: TEST_CONFIG,
        resource: 'credential_issuance',
      }
    );

    expect(result).toMatchObject({
      ok: true,
      payment: {
        payer: '0x4567890AbcdEF1234567890aBcdef1234567890',
        receipt: 'signed-receipt',
        txHash: '0xtxhash',
      },
    });
    expect(client.verifyPayment).toHaveBeenCalledWith('signed-receipt');
    expect(client.settlePayment).not.toHaveBeenCalled();
  });

  it('returns a 402 response when verified payment terms do not match the request', async () => {
    const client = {
      settlePayment: vi.fn(),
      verifyPayment: vi.fn().mockResolvedValue({
        amount: '0.10',
        chainId: 196,
        network: 'xlayer',
        payer: '0x4567890AbcdEF1234567890aBcdef1234567890',
        raw: { status: 'verified' },
        receipt: 'signed-receipt',
        recipient: TEST_CONFIG.recipient,
        resource: 'credential_issuance',
        token: 'USDC',
        tokenAddress: TEST_CONFIG.tokenAddress,
        txHash: '0xtxhash',
      }),
    };

    const result = await verifyX402Payment(
      new Request('http://localhost:3000/api/credential', {
        headers: {
          'payment-signature': 'signed-receipt',
        },
      }),
      {
        amountUsd: '0.50',
        client,
        config: TEST_CONFIG,
        resource: 'credential_issuance',
      }
    );

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error('expected payment verification to fail');
    }

    expect(result.response.status).toBe(402);
    await expect(result.response.json()).resolves.toMatchObject({
      error: {
        code: 'INVALID_PAYMENT',
        details: {
          reason: 'amount_mismatch',
        },
      },
    });
  });

  it('uses the built-in local mock config without x402 env when mock mode is enabled', async () => {
    vi.stubEnv('LOCAL_INTEGRATION_MODE', 'mock');
    vi.stubEnv('NODE_ENV', 'development');

    const result = await verifyX402Payment(new Request('http://localhost:3000/api/credential'), {
      amountUsd: '0.50',
      resource: 'credential_issuance',
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error('expected payment to be rejected');
    }

    await expect(result.response.json()).resolves.toMatchObject({
      paymentRequired: {
        chainId: 196,
        network: 'xlayer',
        recipient: '0x1234567890AbcdEF1234567890aBcdef12345678',
        token: 'USDC',
        tokenAddress: '0x74b7f16337b8972027f6196a17a631ac6de26d22',
      },
    });
  });

  it('accepts the fixed local mock receipt without calling the live payment client', async () => {
    vi.stubEnv('LOCAL_INTEGRATION_MODE', 'mock');
    vi.stubEnv('NODE_ENV', 'development');

    const client = {
      settlePayment: vi.fn(),
      verifyPayment: vi.fn(),
    };

    const result = await verifyX402Payment(
      new Request('http://localhost:3000/api/credential', {
        headers: {
          'payment-signature': LOCAL_MOCK_PAYMENT_RECEIPT,
        },
      }),
      {
        amountUsd: '0.50',
        client,
        resource: 'credential_issuance',
      }
    );

    expect(result).toMatchObject({
      ok: true,
      payment: {
        payer: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
        receipt: LOCAL_MOCK_PAYMENT_RECEIPT,
        txHash: '0xlocalmocktx',
      },
    });
    expect(client.verifyPayment).not.toHaveBeenCalled();
    expect(client.settlePayment).not.toHaveBeenCalled();
  });
});

describe('settleX402Payment', () => {
  it('settles a verified receipt', async () => {
    const client = {
      settlePayment: vi.fn().mockResolvedValue({
        payer: '0x4567890AbcdEF1234567890aBcdef1234567890',
        raw: { status: 'settled' },
        receipt: 'signed-receipt',
        settlementId: 'settlement-1',
        txHash: '0xtxhash',
      }),
      verifyPayment: vi.fn(),
    };

    const result = await settleX402Payment('signed-receipt', {
      amountUsd: '0.50',
      client,
      config: TEST_CONFIG,
      resource: 'credential_issuance',
    });

    expect(result).toMatchObject({
      ok: true,
      payment: {
        payer: '0x4567890AbcdEF1234567890aBcdef1234567890',
        settlementId: 'settlement-1',
      },
    });
    expect(client.settlePayment).toHaveBeenCalledWith('signed-receipt');
  });

  it('returns a 402 response when receipt settlement fails', async () => {
    const client = {
      settlePayment: vi.fn().mockRejectedValue(new Error('receipt_rejected')),
      verifyPayment: vi.fn(),
    };

    const result = await settleX402Payment('bad-receipt', {
      amountUsd: '0.50',
      client,
      config: TEST_CONFIG,
      resource: 'credential_issuance',
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error('expected payment settlement to fail');
    }

    expect(result.response.status).toBe(402);
    await expect(result.response.json()).resolves.toMatchObject({
      error: {
        code: 'INVALID_PAYMENT',
        details: {
          reason: 'receipt_rejected',
        },
      },
      paymentRequired: {
        amount: '0.50',
        resource: 'credential_issuance',
      },
    });
  });
});
