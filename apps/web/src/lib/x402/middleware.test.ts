import { describe, expect, it, vi } from 'vitest';
import { requireX402Payment } from './middleware';

const TEST_CONFIG = {
  chainId: 196,
  network: 'xlayer',
  recipient: '0x1234567890AbcdEF1234567890aBcdef12345678',
  token: 'USDC' as const,
  tokenAddress: '0x74b7f16337b8972027f6196a17a631ac6de26d22',
};

describe('requireX402Payment', () => {
  it('returns a 402 response with payment requirements when the receipt header is missing', async () => {
    const result = await requireX402Payment(new Request('http://localhost:3000/api/credential'), {
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

  it('allows requests with a valid receipt to pass through', async () => {
    const client = {
      settlePayment: vi.fn().mockResolvedValue({
        payer: '0x4567890AbcdEF1234567890aBcdef1234567890',
        raw: { status: 'settled' },
        receipt: 'signed-receipt',
        settlementId: 'settlement-1',
        txHash: '0xtxhash',
      }),
    };

    const result = await requireX402Payment(
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
        settlementId: 'settlement-1',
        txHash: '0xtxhash',
      },
    });
    expect(client.settlePayment).toHaveBeenCalledWith('signed-receipt');
  });

  it('returns a 402 response when receipt settlement fails', async () => {
    const client = {
      settlePayment: vi.fn().mockRejectedValue(new Error('receipt_rejected')),
    };

    const result = await requireX402Payment(
      new Request('http://localhost:3000/api/credential', {
        headers: {
          'payment-signature': 'bad-receipt',
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
