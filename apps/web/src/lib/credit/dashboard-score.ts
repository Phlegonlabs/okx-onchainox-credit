import type { ScoreDimensions, ScoreTier } from '@okx-credit/scoring';

const SCORE_MAX = 850;
const SCORE_MIN = 300;

export type DimensionKey = keyof ScoreDimensions;

export interface TierTheme {
  accent: string;
  glow: string;
  label: string;
}

export interface DimensionDefinition {
  description: string;
  key: DimensionKey;
  label: string;
  weight: number;
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
        accent: 'var(--okx-score-excellent)',
        glow: 'rgba(16,185,129,0.3)',
        label: 'Excellent',
      };
    case 'good':
      return {
        accent: 'var(--okx-score-good)',
        glow: 'rgba(59,130,246,0.28)',
        label: 'Good',
      };
    case 'fair':
      return {
        accent: 'var(--okx-score-fair)',
        glow: 'rgba(245,158,11,0.28)',
        label: 'Fair',
      };
    default:
      return {
        accent: 'var(--okx-score-poor)',
        glow: 'rgba(239,68,68,0.26)',
        label: 'Poor',
      };
  }
}
