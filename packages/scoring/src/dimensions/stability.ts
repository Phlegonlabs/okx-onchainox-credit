// Dimension: position stability (holding duration + volatility) (0-100).
import type { RawWalletData } from '../types.js';

const HOLDING_SCORE_WEIGHT = 70;
const VOLATILITY_SCORE_WEIGHT = 30;
const HOLDING_MONTHS_CAP = 12;
const TARGET_VOLATILITY = 0.08;

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function calculateVolatilityScore(
  priceHistory: RawWalletData['positions'][number]['priceHistory']
): number {
  if (!priceHistory || priceHistory.length < 2) {
    return VOLATILITY_SCORE_WEIGHT;
  }

  const returns = [];
  for (let index = 1; index < priceHistory.length; index++) {
    const previousClose = priceHistory[index - 1]?.close ?? 0;
    const currentClose = priceHistory[index]?.close ?? 0;
    if (previousClose <= 0 || currentClose <= 0) {
      continue;
    }

    returns.push(Math.abs(currentClose - previousClose) / previousClose);
  }

  if (returns.length === 0) {
    return VOLATILITY_SCORE_WEIGHT;
  }

  const averageReturn = returns.reduce((sum, value) => sum + value, 0) / returns.length;
  const normalizedVolatility = Math.min(averageReturn / TARGET_VOLATILITY, 1);

  return (1 - normalizedVolatility) * VOLATILITY_SCORE_WEIGHT;
}

export function scoreStability(data: RawWalletData): number {
  if (data.positions.length === 0) {
    return 50;
  }

  const now = Date.now() / 1000;
  const totalBalanceUsd = data.positions.reduce((sum, position) => sum + position.balanceUsd, 0);

  if (totalBalanceUsd <= 0) {
    return 50;
  }

  const weightedScore = data.positions.reduce((sum, position) => {
    const ageMonths = position.firstAcquired
      ? Math.max((now - position.firstAcquired) / (30 * 24 * 3600), 0)
      : 0;
    const holdingScore = Math.min(ageMonths / HOLDING_MONTHS_CAP, 1) * HOLDING_SCORE_WEIGHT;
    const volatilityScore = calculateVolatilityScore(position.priceHistory);
    const positionScore = holdingScore + volatilityScore;
    const weight = position.balanceUsd / totalBalanceUsd;

    return sum + positionScore * weight;
  }, 0);

  return clampScore(weightedScore);
}
