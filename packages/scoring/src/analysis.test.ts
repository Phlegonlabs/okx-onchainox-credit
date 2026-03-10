import { describe, expect, it } from 'vitest';
import { buildCreditAnalysis } from './analysis.js';
import { createRawWalletData } from './test-support/raw-wallet-data.js';

describe('buildCreditAnalysis', () => {
  it('returns score details and ranked improvement tips', async () => {
    const analysis = await buildCreditAnalysis(createRawWalletData());

    expect(analysis.wallet).toBe('0x1234567890abcdef1234567890abcdef12345678');
    expect(analysis.tier).toBe('good');
    expect(analysis.dimensions.walletAge.score).toBe(100);
    expect(analysis.dimensions.walletAge.detail).toContain('Wallet active for');
    expect(analysis.dimensions.assetScale.detail).toContain('Portfolio value');
    expect(analysis.improvementTips.map((tip) => tip.dimensionKey)).toEqual([
      'repaymentHistory',
      'assetScale',
      'multichain',
    ]);
    expect(analysis.credential).toBeNull();
  });

  it('surfaces neutral detail strings when history is sparse', async () => {
    const baseline = createRawWalletData({
      activeChains: [],
      defiEvents: [],
      events: [],
      hasDeFiPositions: false,
      positions: [],
      totalValueUsd: 0,
    });
    const { oldestEventTimestamp: _ignored, ...sparseData } = baseline;

    const analysis = await buildCreditAnalysis(sparseData);

    expect(analysis.dimensions.walletAge.detail).toContain('neutral activity baseline');
    expect(analysis.dimensions.positionStability.detail).toContain('neutral baseline');
    expect(analysis.dimensions.repaymentHistory.detail).toContain('neutral baseline');
    expect(analysis.dimensions.multichain.detail).toContain('No supported chain activity');
    expect(analysis.dataGaps).toContain('wallet_age_unknown');
  });
});
