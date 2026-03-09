import { afterEach, describe, expect, it } from 'vitest';
import { OkxClient, computeScore } from './index.js';
import type { RawWalletData } from './types.js';

const ORIGINAL_ENV = {
  OKX_API_KEY: process.env.OKX_API_KEY,
  OKX_SECRET_KEY: process.env.OKX_SECRET_KEY,
  OKX_PASSPHRASE: process.env.OKX_PASSPHRASE,
};

function createWalletData(): RawWalletData {
  const nowSeconds = Math.floor(Date.now() / 1000);

  return {
    wallet: '0x1234567890abcdef1234567890abcdef12345678',
    events: Array.from({ length: 240 }, (_, index) => ({
      hash: `hash-${index}`,
      chainId: '1',
      type: 'transfer',
      timestamp: nowSeconds - index * 86_400,
      valueUsd: 100,
    })),
    defiEvents: [],
    positions: [
      {
        tokenId: 'eth',
        symbol: 'ETH',
        chainId: '1',
        balanceUsd: 40_000,
        firstAcquired: nowSeconds - 540 * 86_400,
      },
      {
        tokenId: 'usdc',
        symbol: 'USDC',
        chainId: '8453',
        balanceUsd: 20_000,
        firstAcquired: nowSeconds - 365 * 86_400,
      },
    ],
    totalValueUsd: 60_000,
    hasDeFiPositions: false,
    oldestEventTimestamp: nowSeconds - 365 * 5 * 86_400,
    activeChains: ['1', '10', '56', '196', '8453'],
  };
}

afterEach(() => {
  process.env.OKX_API_KEY = ORIGINAL_ENV.OKX_API_KEY;
  process.env.OKX_SECRET_KEY = ORIGINAL_ENV.OKX_SECRET_KEY;
  process.env.OKX_PASSPHRASE = ORIGINAL_ENV.OKX_PASSPHRASE;
});

describe('computeScore', () => {
  it('returns a bounded score with a full dimension breakdown', async () => {
    const result = await computeScore(createWalletData());

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
