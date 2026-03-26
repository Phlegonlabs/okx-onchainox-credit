// Dimension: multi-chain activity (0-100).
import type { RawWalletData } from '../types.js';

const CHAIN_SCORE_MAP: Record<number, number> = {
  1: 20,
  2: 35,
  3: 50,
  4: 70,
  5: 75,
  6: 100,
};

export function scoreMultichain(data: RawWalletData): number {
  const chainCount = new Set(data.activeChains).size;
  if (chainCount === 0) {
    return 0;
  }

  const capped = Math.min(chainCount, 6);
  return CHAIN_SCORE_MAP[capped] ?? 20;
}
