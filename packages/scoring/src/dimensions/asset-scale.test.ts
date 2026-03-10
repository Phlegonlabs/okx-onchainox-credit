import { describe, expect, it } from 'vitest';
import { createRawWalletData } from '../test-support/raw-wallet-data.js';
import { scoreAssetScale } from './asset-scale.js';

describe('scoreAssetScale', () => {
  it('scores large current portfolios highly', () => {
    expect(
      scoreAssetScale(
        createRawWalletData({
          totalValueUsd: 60_000,
          positions: [
            {
              tokenId: 'eth',
              symbol: 'ETH',
              chainId: '1',
              balanceUsd: 60_000,
            },
          ],
        })
      )
    ).toBe(85);
  });

  it('uses historical prices to discount temporary portfolio spikes', () => {
    expect(
      scoreAssetScale(
        createRawWalletData({
          totalValueUsd: 60_000,
          positions: [
            {
              tokenId: 'eth',
              symbol: 'ETH',
              chainId: '1',
              balanceUsd: 60_000,
              priceHistory: [
                { timestamp: 1, open: 1000, high: 1000, low: 1000, close: 1000 },
                { timestamp: 2, open: 1000, high: 1000, low: 1000, close: 1000 },
                { timestamp: 3, open: 4000, high: 4000, low: 4000, close: 4000 },
              ],
            },
          ],
        })
      )
    ).toBe(70);
  });

  it('returns zero for portfolios below the minimum credibility threshold', () => {
    expect(
      scoreAssetScale(
        createRawWalletData({
          totalValueUsd: 80,
          positions: [
            {
              tokenId: 'usdc',
              symbol: 'USDC',
              chainId: '1',
              balanceUsd: 80,
            },
          ],
        })
      )
    ).toBe(0);
  });
});
