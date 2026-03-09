// Score aggregation: 5 dimensions → 300-850 weighted score.
// Implement dimension functions during M2-002 through M2-007.
import type { RawWalletData, Score, ScoreDimensions, ScoreTier } from './types.js';

const WEIGHTS = {
  walletAge: 0.2,
  assetScale: 0.25,
  positionStability: 0.2,
  repaymentHistory: 0.25,
  multichain: 0.1,
} as const;

function tierFromScore(score: number): ScoreTier {
  if (score >= 750) return 'excellent';
  if (score >= 650) return 'good';
  if (score >= 500) return 'fair';
  return 'poor';
}

export async function computeScore(data: RawWalletData): Promise<Score> {
  const { scoreWalletAge } = await import('./dimensions/wallet-age.js');
  const { scoreAssetScale } = await import('./dimensions/asset-scale.js');
  const { scoreStability } = await import('./dimensions/stability.js');
  const { scoreRepayment } = await import('./dimensions/repayment.js');
  const { scoreMultichain } = await import('./dimensions/multichain.js');

  const dimensions: ScoreDimensions = {
    walletAge: scoreWalletAge(data),
    assetScale: scoreAssetScale(data),
    positionStability: scoreStability(data),
    repaymentHistory: scoreRepayment(data),
    multichain: scoreMultichain(data),
  };

  const weightedSum =
    dimensions.walletAge * WEIGHTS.walletAge +
    dimensions.assetScale * WEIGHTS.assetScale +
    dimensions.positionStability * WEIGHTS.positionStability +
    dimensions.repaymentHistory * WEIGHTS.repaymentHistory +
    dimensions.multichain * WEIGHTS.multichain;

  // Map 0-100 weighted sum to 300-850 range
  const score = Math.round(300 + (weightedSum / 100) * 550);
  const clampedScore = Math.max(300, Math.min(850, score));

  const now = new Date();
  const expires = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  return {
    wallet: data.wallet,
    score: clampedScore,
    tier: tierFromScore(clampedScore),
    dimensions,
    computedAt: now.toISOString(),
    expiresAt: expires.toISOString(),
  };
}
