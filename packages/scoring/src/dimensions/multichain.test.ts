import { describe, expect, it } from 'vitest';
import { createRawWalletData } from '../test-support/raw-wallet-data.js';
import { scoreMultichain } from './multichain.js';

describe('scoreMultichain', () => {
  it('returns zero when there is no cross-chain activity', () => {
    expect(
      scoreMultichain(
        createRawWalletData({
          activeChains: [],
        })
      )
    ).toBe(0);
  });

  it('scores a single active chain conservatively', () => {
    expect(
      scoreMultichain(
        createRawWalletData({
          activeChains: ['1'],
        })
      )
    ).toBe(20);
  });

  it('gives full credit once the wallet is active on more than five chains', () => {
    expect(
      scoreMultichain(
        createRawWalletData({
          activeChains: ['1', '10', '56', '137', '196', '8453', '1'],
        })
      )
    ).toBe(100);
  });
});
