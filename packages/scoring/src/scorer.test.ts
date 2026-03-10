import { describe, expect, it } from 'vitest';
import { computeScore } from './scorer.js';
import { createRawWalletData } from './test-support/raw-wallet-data.js';

describe('computeScore', () => {
  it('returns a high-tier score for mature healthy wallets', async () => {
    const result = await computeScore(createRawWalletData());

    expect(result.score).toBeGreaterThanOrEqual(700);
    expect(result.tier).toBe('good');
    expect(result.dataGaps).toContain('no_defi_history');
  });

  it('flags wallets with insufficient history', async () => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const result = await computeScore(
      createRawWalletData({
        oldestEventTimestamp: nowSeconds - 14 * 24 * 60 * 60,
        events: Array.from({ length: 2 }, (_, index) => ({
          hash: `fresh-wallet-${index}`,
          chainId: '1',
          type: 'transfer',
          timestamp: nowSeconds - index * 24 * 60 * 60,
          valueUsd: 15,
        })),
        positions: [],
        totalValueUsd: 0,
        activeChains: ['1'],
      })
    );

    expect(result.score).toBeGreaterThanOrEqual(300);
    expect(result.score).toBeLessThan(500);
    expect(result.tier).toBe('poor');
    expect(result.dataGaps).toContain('insufficient_wallet_history');
    expect(result.dataGaps).toContain('no_defi_history');
  });
});
