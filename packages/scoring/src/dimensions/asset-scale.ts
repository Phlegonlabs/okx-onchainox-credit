// Dimension: asset scale / portfolio value (0-100).
import type { RawWalletData } from '../types.js';

const BRACKETS = [
  { min: 100_000, score: 100 },
  { min: 50_000, score: 85 },
  { min: 10_000, score: 70 },
  { min: 1_000, score: 50 },
  { min: 100, score: 30 },
  { min: 0, score: 10 },
];

function estimateHistoricalBalanceUsd(balanceUsd: number, closes: number[]): number {
  const currentClose = closes.at(-1) ?? 0;
  if (currentClose <= 0) {
    return balanceUsd;
  }

  const weightedCloseSum = closes.reduce((sum, close, index) => sum + close * (index + 1), 0);
  const totalWeight = closes.reduce((sum, _close, index) => sum + index + 1, 0);
  const weightedAverageClose = totalWeight > 0 ? weightedCloseSum / totalWeight : currentClose;

  return balanceUsd * (weightedAverageClose / currentClose);
}

function getEffectivePortfolioValue(data: RawWalletData): number {
  if (data.positions.length === 0) {
    return data.totalValueUsd;
  }

  const normalizedPositionValue = data.positions.reduce((total, position) => {
    const closes =
      position.priceHistory?.map((candle) => candle.close).filter((close) => close > 0) ?? [];
    if (closes.length === 0) {
      return total + position.balanceUsd;
    }

    return (
      total +
      Math.min(position.balanceUsd, estimateHistoricalBalanceUsd(position.balanceUsd, closes))
    );
  }, 0);

  return normalizedPositionValue > 0 ? normalizedPositionValue : data.totalValueUsd;
}

export function scoreAssetScale(data: RawWalletData): number {
  const effectivePortfolioValue = getEffectivePortfolioValue(data);
  if (effectivePortfolioValue < 100) {
    return 0;
  }

  for (const bracket of BRACKETS) {
    if (effectivePortfolioValue >= bracket.min) {
      return bracket.score;
    }
  }

  return 0;
}
