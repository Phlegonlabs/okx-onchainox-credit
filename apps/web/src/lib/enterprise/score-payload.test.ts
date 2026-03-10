import { describe, expect, it } from 'vitest';
import { createScoreQueryPayload } from './score-payload';

describe('createScoreQueryPayload', () => {
  it('projects a score into the enterprise API response shape', () => {
    expect(
      createScoreQueryPayload('0x1234567890AbcdEF1234567890aBcdef12345678', {
        computedAt: '2026-03-10T00:00:00.000Z',
        dataGaps: ['no_defi_history'],
        dimensions: {
          assetScale: 72,
          multichain: 61,
          positionStability: 68,
          repaymentHistory: 84,
          walletAge: 79,
        },
        expiresAt: '2026-03-11T00:00:00.000Z',
        score: 721,
        stale: true,
        tier: 'good',
      })
    ).toEqual({
      breakdown: {
        assetScale: 72,
        multichain: 61,
        positionStability: 68,
        repaymentHistory: 84,
        walletAge: 79,
      },
      computedAt: '2026-03-10T00:00:00.000Z',
      dataGaps: ['no_defi_history'],
      expiresAt: '2026-03-11T00:00:00.000Z',
      issuer: 'okx-onchainos-credit',
      score: 721,
      stale: true,
      tier: 'good',
      version: '1.0',
      wallet: '0x1234567890AbcdEF1234567890aBcdef12345678',
    });
  });

  it('defaults optional fields for clean signatures', () => {
    expect(
      createScoreQueryPayload('0x1234567890AbcdEF1234567890aBcdef12345678', {
        computedAt: '2026-03-10T00:00:00.000Z',
        dimensions: {
          assetScale: 72,
          multichain: 61,
          positionStability: 68,
          repaymentHistory: 84,
          walletAge: 79,
        },
        expiresAt: '2026-03-11T00:00:00.000Z',
        score: 721,
        tier: 'good',
      })
    ).toMatchObject({
      dataGaps: [],
      stale: false,
    });
  });
});
