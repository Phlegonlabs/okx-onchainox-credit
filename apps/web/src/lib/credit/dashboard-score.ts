import type { ScoreDimensions, ScoreTier } from '@okx-credit/scoring';

const SCORE_MAX = 850;
const SCORE_MIN = 300;

export type DimensionKey = keyof ScoreDimensions;

export interface TierTheme {
  accent: string;
  label: string;
}

export interface DimensionDefinition {
  description: string;
  key: DimensionKey;
  label: string;
  weight: number;
}

export interface ImprovementTip {
  currentValue: number;
  dimensionKey: DimensionKey;
  estimatedPointGain: number;
  label: string;
  summary: string;
}

export const dimensionDefinitions: DimensionDefinition[] = [
  {
    key: 'walletAge',
    label: 'Wallet age',
    description: 'Tenure and transaction cadence over time.',
    weight: 0.2,
  },
  {
    key: 'assetScale',
    label: 'Asset scale',
    description: 'Portfolio depth priced in USD.',
    weight: 0.25,
  },
  {
    key: 'positionStability',
    label: 'Position stability',
    description: 'Holding duration and volatility tolerance.',
    weight: 0.2,
  },
  {
    key: 'repaymentHistory',
    label: 'Repayment history',
    description: 'Borrow and repay discipline across DeFi activity.',
    weight: 0.25,
  },
  {
    key: 'multichain',
    label: 'Multichain activity',
    description: 'Breadth of credible activity across supported chains.',
    weight: 0.1,
  },
];

export function getDimensionEntries(dimensions: ScoreDimensions) {
  return dimensionDefinitions.map((definition) => ({
    ...definition,
    value: dimensions[definition.key],
  }));
}

function getTipSummary(key: DimensionKey): string {
  switch (key) {
    case 'walletAge':
      return 'Keep the wallet active over longer windows and avoid starting from a fresh address for every protocol interaction.';
    case 'assetScale':
      return 'Increase retained portfolio depth and maintain higher average balance instead of cycling everything out immediately.';
    case 'positionStability':
      return 'Hold core positions longer and reduce rapid in-and-out trading that signals unstable capital.';
    case 'repaymentHistory':
      return 'Repay DeFi borrows cleanly and avoid letting open debt linger through volatile periods.';
    case 'multichain':
      return 'Build credible activity on more supported chains instead of staying concentrated on a single venue.';
  }
}

export function getImprovementTips(dimensions: ScoreDimensions, limit = 3): ImprovementTip[] {
  return getDimensionEntries(dimensions)
    .map((entry) => ({
      dimensionKey: entry.key,
      label: entry.label,
      currentValue: entry.value,
      estimatedPointGain: Math.max(1, Math.round((100 - entry.value) * entry.weight * 5.5)),
      summary: getTipSummary(entry.key),
    }))
    .sort(
      (left, right) =>
        right.estimatedPointGain - left.estimatedPointGain || left.currentValue - right.currentValue
    )
    .slice(0, limit);
}

export function clampCreditScore(score: number): number {
  return Math.min(SCORE_MAX, Math.max(SCORE_MIN, Math.round(score)));
}

export function getGaugeProgress(score: number): number {
  return (clampCreditScore(score) - SCORE_MIN) / (SCORE_MAX - SCORE_MIN);
}

export function getGaugeRotation(score: number): number {
  return -120 + getGaugeProgress(score) * 240;
}

export function getTierTheme(tier: ScoreTier): TierTheme {
  switch (tier) {
    case 'excellent':
      return {
        accent: 'var(--score-excellent)',
        label: 'Excellent',
      };
    case 'good':
      return {
        accent: 'var(--score-good)',
        label: 'Good',
      };
    case 'fair':
      return {
        accent: 'var(--score-fair)',
        label: 'Fair',
      };
    default:
      return {
        accent: 'var(--score-poor)',
        label: 'Poor',
      };
  }
}
