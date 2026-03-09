// Dimension: position stability (holding duration + volatility) (0-100).
// Implement during M2-004.
import type { RawWalletData } from '../types.js';

export function scoreStability(data: RawWalletData): number {
  // TODO: M2-004 — avg holding duration + volatility exposure from price history
  if (data.positions.length === 0) return 50;
  const now = Date.now() / 1000;
  const holdingDurations = data.positions
    .filter((p) => p.firstAcquired)
    .map((p) => (now - (p.firstAcquired ?? now)) / (30 * 24 * 3600)); // months

  if (holdingDurations.length === 0) return 50;
  const avgMonths = holdingDurations.reduce((a, b) => a + b, 0) / holdingDurations.length;
  return Math.min(Math.round((avgMonths / 12) * 100), 100);
}
