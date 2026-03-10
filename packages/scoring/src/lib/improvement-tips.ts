import type { CreditImprovementTip, ScoreDimensions } from '../types.js';

const dimensionDefinitions = [
  {
    key: 'walletAge',
    label: 'Wallet age',
    weight: 0.2,
  },
  {
    key: 'assetScale',
    label: 'Asset scale',
    weight: 0.25,
  },
  {
    key: 'positionStability',
    label: 'Position stability',
    weight: 0.2,
  },
  {
    key: 'repaymentHistory',
    label: 'Repayment history',
    weight: 0.25,
  },
  {
    key: 'multichain',
    label: 'Multichain activity',
    weight: 0.1,
  },
] as const satisfies ReadonlyArray<{
  key: keyof ScoreDimensions;
  label: string;
  weight: number;
}>;

function getAction(key: keyof ScoreDimensions): string {
  switch (key) {
    case 'walletAge':
      return 'Keep the wallet active over longer windows and avoid resetting protocol history to fresh addresses.';
    case 'assetScale':
      return 'Increase retained portfolio depth and maintain higher average balances instead of rotating capital out immediately.';
    case 'positionStability':
      return 'Hold core positions longer and reduce rapid in-and-out trading that signals unstable capital.';
    case 'repaymentHistory':
      return 'Repay DeFi borrows cleanly and avoid leaving debt open through volatile periods.';
    case 'multichain':
      return 'Build credible activity on more supported chains instead of concentrating usage on a single venue.';
  }
}

export function getImprovementTips(dimensions: ScoreDimensions, limit = 3): CreditImprovementTip[] {
  return dimensionDefinitions
    .map((definition) => ({
      action: getAction(definition.key),
      currentValue: dimensions[definition.key],
      dimensionKey: definition.key,
      dimensionLabel: definition.label,
      estimatedPointGain: Math.max(
        1,
        Math.round((100 - dimensions[definition.key]) * definition.weight * 5.5)
      ),
    }))
    .sort(
      (left, right) =>
        right.estimatedPointGain - left.estimatedPointGain || left.currentValue - right.currentValue
    )
    .slice(0, limit);
}
