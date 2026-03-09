import type { RawWalletData } from '../types.js';

export function createRawWalletData(overrides: Partial<RawWalletData> = {}): RawWalletData {
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
    ...overrides,
  };
}
