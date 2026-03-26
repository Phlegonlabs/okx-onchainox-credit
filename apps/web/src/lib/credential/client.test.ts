import { describe, expect, it } from 'vitest';
import { parseCredentialApiResponse } from './client';

describe('parseCredentialApiResponse', () => {
  it('recognizes a signed credential payload', () => {
    const result = parseCredentialApiResponse(200, {
      dimensions: {
        assetScale: 82,
        multichain: 63,
        positionStability: 74,
        repaymentHistory: 88,
        walletAge: 79,
      },
      expiresAt: 1_800_000_000,
      issuedAt: 1_797_408_000,
      issuer: 'graxis',
      score: 742,
      signature: '0xsigned',
      tier: 'good',
      version: '1.0',
      wallet: '0x1234567890AbcdEF1234567890aBcdef12345678',
    });

    expect(result).toEqual({
      kind: 'issued',
      credential: expect.objectContaining({
        score: 742,
        signature: '0xsigned',
      }),
    });
  });

  it('recognizes payment requirements from a 402 response', () => {
    const result = parseCredentialApiResponse(402, {
      error: {
        code: 'PAYMENT_REQUIRED',
        message: 'x402 payment required for this resource',
      },
      paymentRequired: {
        amount: '0.50',
        chainId: 196,
        header: 'Payment-Signature',
        network: 'xlayer',
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
        recipient: '0x1234567890AbcdEF1234567890aBcdef12345678',
        resource: 'credential_issuance',
        token: 'USDC',
        tokenAddress: '0x74b7f16337b8972027f6196a17a631ac6de26d22',
      },
    });

    expect(result).toEqual({
      error: {
        code: 'PAYMENT_REQUIRED',
        message: 'x402 payment required for this resource',
      },
      kind: 'payment_required',
      paymentRequired: expect.objectContaining({
        token: 'USDC',
      }),
    });
  });

  it('falls back to a generic error shape for non-credential payloads', () => {
    const result = parseCredentialApiResponse(500, {
      error: {
        code: 'CREDENTIAL_ISSUANCE_FAILED',
        message: 'Unable to issue credential.',
      },
    });

    expect(result).toEqual({
      error: {
        code: 'CREDENTIAL_ISSUANCE_FAILED',
        message: 'Unable to issue credential.',
      },
      kind: 'error',
    });
  });
});
