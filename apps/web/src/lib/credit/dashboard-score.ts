import type { ScoreTier } from '@okx-credit/scoring';

const SCORE_MAX = 850;
const SCORE_MIN = 300;

export interface TierTheme {
  accent: string;
  glow: string;
  label: string;
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
