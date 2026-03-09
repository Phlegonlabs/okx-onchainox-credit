// Dimension: asset scale / portfolio value (0-100).
// Implement during M2-003.
import type { RawWalletData } from '../types.js';

const BRACKETS = [
  { min: 100_000, score: 100 },
  { min: 50_000, score: 85 },
  { min: 10_000, score: 70 },
  { min: 1_000, score: 50 },
  { min: 100, score: 30 },
  { min: 0, score: 10 },
];

export function scoreAssetScale(data: RawWalletData): number {
  // TODO: M2-003 — use OKX Market API for accurate historical valuation
  for (const bracket of BRACKETS) {
    if (data.totalValueUsd >= bracket.min) return bracket.score;
  }
  return 0;
}
