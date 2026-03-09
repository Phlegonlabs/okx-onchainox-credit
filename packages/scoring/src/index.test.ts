import { describe, expect, it } from 'vitest';
import { OkxClient, computeScore } from './index.js';
import { createRawWalletData } from './test-support/raw-wallet-data.js';

describe('computeScore', () => {
  it('returns a bounded score with a full dimension breakdown', async () => {
    const result = await computeScore(createRawWalletData());

    expect(result.wallet).toBe('0x1234567890abcdef1234567890abcdef12345678');
    expect(result.score).toBeGreaterThanOrEqual(300);
    expect(result.score).toBeLessThanOrEqual(850);
    expect(result.tier).toBe('good');
    expect(result.dimensions).toEqual({
      walletAge: 100,
      assetScale: 85,
      positionStability: 100,
      repaymentHistory: 50,
      multichain: 75,
    });
  });
});

describe('OkxClient', () => {
  it('fails fast when required env vars are missing', () => {
    process.env.OKX_API_KEY = '';
    process.env.OKX_SECRET_KEY = '';
    process.env.OKX_PASSPHRASE = '';

    expect(() => OkxClient.fromEnv()).toThrow(
      'OKX_API_KEY, OKX_SECRET_KEY, and OKX_PASSPHRASE must be set'
    );
  });
});
