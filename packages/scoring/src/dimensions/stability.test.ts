import { describe, expect, it } from 'vitest';
import { createRawWalletData } from '../test-support/raw-wallet-data.js';
import { scoreStability } from './stability.js';

describe('scoreStability', () => {
  it('rewards long-held positions with stable price history', () => {
    const nowSeconds = Math.floor(Date.now() / 1000);

    expect(
      scoreStability(
        createRawWalletData({
          positions: [
            {
              tokenId: 'eth',
              symbol: 'ETH',
              chainId: '1',
              balanceUsd: 40_000,
              firstAcquired: nowSeconds - 18 * 30 * 24 * 60 * 60,
              priceHistory: [
                { timestamp: 1, open: 2000, high: 2050, low: 1980, close: 2020 },
                { timestamp: 2, open: 2020, high: 2060, low: 2000, close: 2040 },
                { timestamp: 3, open: 2040, high: 2070, low: 2025, close: 2055 },
              ],
            },
          ],
        })
      )
    ).toBeGreaterThanOrEqual(85);
  });

  it('penalizes short-lived, volatile positions', () => {
    const nowSeconds = Math.floor(Date.now() / 1000);

    expect(
      scoreStability(
        createRawWalletData({
          positions: [
            {
              tokenId: 'memecoin',
              symbol: 'MEME',
              chainId: '8453',
              balanceUsd: 5_000,
              firstAcquired: nowSeconds - 20 * 24 * 60 * 60,
              priceHistory: [
                { timestamp: 1, open: 10, high: 16, low: 7, close: 15 },
                { timestamp: 2, open: 15, high: 18, low: 5, close: 8 },
                { timestamp: 3, open: 8, high: 13, low: 4, close: 5 },
              ],
            },
          ],
        })
      )
    ).toBeLessThan(30);
  });

  it('returns neutral when no positions are available', () => {
    expect(
      scoreStability(
        createRawWalletData({
          positions: [],
        })
      )
    ).toBe(50);
  });
});
