import { describe, expect, it } from 'vitest';
import { parseScoreApiResponse, parseScoreJobSnapshot } from './score-client';

describe('parseScoreApiResponse', () => {
  it('recognizes a signed paid score payload', () => {
    const result = parseScoreApiResponse(200, {
      breakdown: {
        assetScale: 82,
        multichain: 63,
        positionStability: 74,
        repaymentHistory: 88,
        walletAge: 79,
      },
      computedAt: '2026-03-11T12:00:00.000Z',
      dataGaps: ['no_defi_history'],
      expiresAt: '2026-03-12T12:00:00.000Z',
      issuer: 'graxis',
      score: 742,
      signature: '0xsigned',
      stale: false,
      tier: 'good',
      version: '1.0',
      wallet: '0x1234567890AbcdEF1234567890aBcdef12345678',
    });

    expect(result).toEqual({
      kind: 'paid_score',
      score: expect.objectContaining({
        score: 742,
        signature: '0xsigned',
      }),
    });
  });

  it('recognizes payment requirements from a 402 response', () => {
    const result = parseScoreApiResponse(402, {
      error: {
        code: 'PAYMENT_REQUIRED',
        message: 'x402 payment required for this resource',
      },
      paymentRequired: {
        amount: '0.10',
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
          maxAmountRequired: '100000',
          maxTimeoutSeconds: 600,
          mimeType: 'application/json',
          payTo: '0x1234567890AbcdEF1234567890aBcdef12345678',
          resource: 'http://localhost:3000/api/v1/score',
          scheme: 'exact',
          x402Version: 1,
        },
        recipient: '0x1234567890AbcdEF1234567890aBcdef12345678',
        resource: 'score_query',
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
        resource: 'score_query',
      }),
    });
  });

  it('recognizes a processing response from a 202 score job', () => {
    const result = parseScoreApiResponse(202, {
      attemptCount: 0,
      jobToken: 'job-token',
      kind: 'processing',
      status: 'pending',
      statusMessage: 'Payment accepted. Queueing credit report generation.',
      statusUrl: 'http://localhost:3000/api/v1/score/jobs/job-token',
      streamUrl: 'http://localhost:3000/api/v1/score/jobs/job-token/events',
    });

    expect(result).toEqual({
      kind: 'processing',
      processing: expect.objectContaining({
        jobToken: 'job-token',
        status: 'pending',
      }),
    });
  });

  it('falls back to a generic error shape for non-score payloads', () => {
    const result = parseScoreApiResponse(429, {
      error: {
        code: 'RATE_LIMITED',
        message: 'Enterprise API rate limit exceeded.',
      },
    });

    expect(result).toEqual({
      error: {
        code: 'RATE_LIMITED',
        message: 'Enterprise API rate limit exceeded.',
      },
      kind: 'error',
    });
  });

  it('parses score job snapshots for status polling and SSE payloads', () => {
    expect(
      parseScoreJobSnapshot({
        attemptCount: 2,
        kind: 'completed',
        result: {
          breakdown: {
            assetScale: 82,
            multichain: 63,
            positionStability: 74,
            repaymentHistory: 88,
            walletAge: 79,
          },
          computedAt: '2026-03-11T12:00:00.000Z',
          dataGaps: [],
          expiresAt: '2026-03-12T12:00:00.000Z',
          issuer: 'graxis',
          score: 742,
          signature: '0xsigned',
          stale: false,
          tier: 'good',
          version: '1.0',
          wallet: '0x1234567890AbcdEF1234567890aBcdef12345678',
        },
        status: 'completed',
      })
    ).toMatchObject({
      kind: 'completed',
      status: 'completed',
    });
  });
});
