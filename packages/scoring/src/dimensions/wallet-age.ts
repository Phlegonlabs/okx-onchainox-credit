// Dimension: wallet age + activity frequency (0-100).
// Implement during M2-002.
import type { RawWalletData } from '../types.js';

export function scoreWalletAge(data: RawWalletData): number {
  // TODO: M2-002
  // Algorithm:
  //   ageMonths = (now - oldestEventTimestamp) / (30 * 24 * 3600)
  //   ageFactor = min(ageMonths / 48, 1) * 60   // 4 years = max age score
  //   activityFactor = min(events.length / 200, 1) * 40  // 200+ txs = max activity
  //   return ageFactor + activityFactor
  if (!data.oldestEventTimestamp) return 50; // neutral — no data
  const ageMs = Date.now() - data.oldestEventTimestamp * 1000;
  const ageMonths = ageMs / (30 * 24 * 60 * 60 * 1000);
  const ageFactor = Math.min(ageMonths / 48, 1) * 60;
  const activityFactor = Math.min(data.events.length / 200, 1) * 40;
  return Math.round(ageFactor + activityFactor);
}
