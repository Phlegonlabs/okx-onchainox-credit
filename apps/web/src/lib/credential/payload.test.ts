import { describe, expect, it } from 'vitest';
import { createCredentialPayload, isCredentialPayload } from './payload';

describe('createCredentialPayload', () => {
  it('builds the PRD credential shape with a 30 day expiry window', () => {
    const payload = createCredentialPayload(
      '0x1234567890AbcdEF1234567890aBcdef12345678',
      {
        dimensions: {
          assetScale: 72,
          multichain: 68,
          positionStability: 74,
          repaymentHistory: 81,
          walletAge: 77,
        },
        score: 720,
        tier: 'good',
      },
      new Date('2026-03-10T00:00:00.000Z')
    );

    expect(payload).toEqual({
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
      tier: 'good',
      version: '1.0',
      wallet: '0x1234567890AbcdEF1234567890aBcdef12345678',
    });
  });
});

describe('isCredentialPayload', () => {
  it('accepts valid credential payloads', () => {
    expect(
      isCredentialPayload(
        createCredentialPayload(
          '0x1234567890AbcdEF1234567890aBcdef12345678',
          {
            dimensions: {
              assetScale: 72,
              multichain: 68,
              positionStability: 74,
              repaymentHistory: 81,
              walletAge: 77,
            },
            score: 720,
            tier: 'good',
          },
          new Date('2026-03-10T00:00:00.000Z')
        )
      )
    ).toBe(true);
  });

  it('rejects malformed or expired-shape payloads', () => {
    expect(
      isCredentialPayload({
        dimensions: {
          assetScale: 72,
          multichain: 68,
          positionStability: 74,
          repaymentHistory: 81,
          walletAge: 77,
        },
        expiresAt: 1775692801,
        issuedAt: 1773100800,
        issuer: 'okx-onchainos-credit',
        score: 720,
        tier: 'good',
        version: '1.0',
        wallet: '0x1234567890AbcdEF1234567890aBcdef12345678',
      })
    ).toBe(false);
  });
});
