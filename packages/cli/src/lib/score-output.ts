import type { Score } from '@graxis/scoring';

const dimensionLabels: Record<keyof Score['dimensions'], string> = {
  walletAge: 'Wallet age',
  assetScale: 'Asset scale',
  positionStability: 'Position stability',
  repaymentHistory: 'Repayment history',
  multichain: 'Multichain activity',
};

export type ScoreOutputFormat = 'json' | 'table';

export function formatScoreAsJson(score: Score): string {
  return JSON.stringify(score, null, 2);
}

export function formatScoreAsTable(score: Score): string {
  const dimensionLines = Object.entries(score.dimensions).map(
    ([key, value]) => `  ${dimensionLabels[key as keyof Score['dimensions']]}: ${value}`
  );
  const dataGapsLine =
    score.dataGaps && score.dataGaps.length > 0 ? `Data gaps: ${score.dataGaps.join(', ')}` : null;

  return [
    `Wallet: ${score.wallet}`,
    `Score: ${score.score} (${score.tier})`,
    `Computed at: ${score.computedAt}`,
    `Expires at: ${score.expiresAt}`,
    'Dimensions:',
    ...dimensionLines,
    ...(dataGapsLine ? [dataGapsLine] : []),
  ].join('\n');
}
