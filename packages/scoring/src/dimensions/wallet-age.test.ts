import { describe, expect, it } from 'vitest';
import { createRawWalletData } from '../test-support/raw-wallet-data.js';
import { scoreWalletAge } from './wallet-age.js';

describe('scoreWalletAge', () => {
  it('returns a strong score for old, consistently active wallets', () => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const score = scoreWalletAge(
      createRawWalletData({
        oldestEventTimestamp: nowSeconds - 60 * 30 * 24 * 60 * 60,
      })
    );

    expect(score).toBe(100);
  });

  it('returns a low score for new wallets with limited history', () => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const score = scoreWalletAge(
      createRawWalletData({
        oldestEventTimestamp: nowSeconds - 20 * 24 * 60 * 60,
        events: Array.from({ length: 3 }, (_, index) => ({
          hash: `new-wallet-${index}`,
          chainId: '1',
          type: 'transfer',
          timestamp: nowSeconds - index * 24 * 60 * 60,
          valueUsd: 25,
        })),
      })
    );

    expect(score).toBeLessThan(35);
  });

  it('penalizes old wallets that stayed mostly inactive', () => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const score = scoreWalletAge(
      createRawWalletData({
        oldestEventTimestamp: nowSeconds - 60 * 30 * 24 * 60 * 60,
        events: Array.from({ length: 12 }, (_, index) => ({
          hash: `inactive-wallet-${index}`,
          chainId: '1',
          type: 'transfer',
          timestamp: nowSeconds - index * 120 * 24 * 60 * 60,
          valueUsd: 50,
        })),
      })
    );

    expect(score).toBeGreaterThanOrEqual(60);
    expect(score).toBeLessThan(70);
  });
});
