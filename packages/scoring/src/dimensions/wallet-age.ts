// Dimension: wallet age + activity frequency (0-100).
import type { RawWalletData } from '../types.js';

const AGE_SCORE_CAP_MONTHS = 48;
const AGE_SCORE_WEIGHT = 60;
const ACTIVITY_SCORE_WEIGHT = 40;
const TARGET_TX_PER_MONTH = 4;

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function scoreWalletAge(data: RawWalletData): number {
  if (!data.oldestEventTimestamp) {
    return 50;
  }

  const ageMs = Date.now() - data.oldestEventTimestamp * 1000;
  const ageMonths = Math.max(ageMs / (30 * 24 * 60 * 60 * 1000), 0);
  const activityWindowMonths = Math.max(Math.ceil(ageMonths), 1);
  const transactionsPerMonth = data.events.length / activityWindowMonths;

  const ageFactor = Math.min(ageMonths / AGE_SCORE_CAP_MONTHS, 1) * AGE_SCORE_WEIGHT;
  const activityFactor =
    Math.min(transactionsPerMonth / TARGET_TX_PER_MONTH, 1) * ACTIVITY_SCORE_WEIGHT;

  if (ageMonths >= AGE_SCORE_CAP_MONTHS && transactionsPerMonth >= TARGET_TX_PER_MONTH * 0.95) {
    return 100;
  }

  return clampScore(ageFactor + activityFactor);
}
