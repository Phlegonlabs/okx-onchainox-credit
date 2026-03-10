import { summarizeDefiEvents } from './lib/defi-parser.js';
import { getImprovementTips } from './lib/improvement-tips.js';
import { loadRawWalletData } from './lib/wallet-data.js';
import { computeScore } from './scorer.js';
import type { CreditAnalysis, CreditAnalysisDimensions, RawWalletData, Score } from './types.js';

const USD_FORMATTER = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const CHAIN_LABELS: Record<string, string> = {
  '1': 'Ethereum',
  '10': 'Optimism',
  '56': 'BNB Chain',
  '137': 'Polygon',
  '196': 'X Layer',
  '501': 'Solana',
  '8453': 'Base',
  '42161': 'Arbitrum',
};

function formatCurrency(value: number): string {
  return USD_FORMATTER.format(Math.max(0, value));
}

function formatMonths(value: number): string {
  if (value < 1) {
    return `${Math.max(1, Math.round(value * 30))} days`;
  }

  return `${value.toFixed(value >= 10 ? 0 : 1)} months`;
}

function getWalletAgeDetail(data: RawWalletData): string {
  if (!data.oldestEventTimestamp) {
    return 'Oldest transaction timestamp is unavailable, so wallet age uses a neutral activity baseline.';
  }

  const ageMonths = Math.max((Date.now() / 1000 - data.oldestEventTimestamp) / (30 * 24 * 3600), 0);
  const activityWindowMonths = Math.max(Math.ceil(ageMonths), 1);
  const transactionsPerMonth = data.events.length / activityWindowMonths;

  return `Wallet active for ${formatMonths(ageMonths)} with ${data.events.length} transactions (~${transactionsPerMonth.toFixed(1)}/month).`;
}

function getAssetScaleDetail(data: RawWalletData): string {
  return `Portfolio value ${formatCurrency(data.totalValueUsd)} across ${data.positions.length} tracked positions.`;
}

function getWeightedHoldingMonths(data: RawWalletData): number {
  const totalBalanceUsd = data.positions.reduce((sum, position) => sum + position.balanceUsd, 0);
  if (totalBalanceUsd <= 0) {
    return 0;
  }

  const now = Date.now() / 1000;

  return data.positions.reduce((sum, position) => {
    const holdingMonths = position.firstAcquired
      ? Math.max((now - position.firstAcquired) / (30 * 24 * 3600), 0)
      : 0;
    const weight = position.balanceUsd / totalBalanceUsd;

    return sum + holdingMonths * weight;
  }, 0);
}

function getStabilityDetail(data: RawWalletData): string {
  if (data.positions.length === 0) {
    return 'No current positions detected, so position stability uses a neutral baseline.';
  }

  return `Average holding duration ${formatMonths(getWeightedHoldingMonths(data))} across ${data.positions.length} active positions.`;
}

function getRepaymentDetail(data: RawWalletData): string {
  if (data.defiEvents.length === 0 && !data.hasDeFiPositions) {
    return 'No DeFi borrowing history detected, so repayment history uses a neutral baseline.';
  }

  const summary = summarizeDefiEvents(data.defiEvents);

  if (summary.totalBorrows === 0) {
    return `No borrow events detected across ${Math.max(summary.protocols.length, 1)} DeFi protocol(s); deposits provide a mild positive signal.`;
  }

  const liquidationText =
    summary.liquidations > 0
      ? `with ${summary.liquidations} liquidation${summary.liquidations === 1 ? '' : 's'}`
      : 'with no liquidations';

  return `Repaid ${summary.repaidBorrows}/${summary.totalBorrows} borrow positions ${liquidationText}.`;
}

function getMultichainDetail(data: RawWalletData): string {
  const labels = [...new Set(data.activeChains)]
    .map((chainId) => CHAIN_LABELS[chainId] ?? `Chain ${chainId}`)
    .sort((left, right) => left.localeCompare(right));

  if (labels.length === 0) {
    return 'No supported chain activity detected yet.';
  }

  return `Active on ${labels.length} chains: ${labels.join(', ')}.`;
}

function buildDimensionDetails(data: RawWalletData, score: Score): CreditAnalysisDimensions {
  return {
    walletAge: {
      score: score.dimensions.walletAge,
      detail: getWalletAgeDetail(data),
    },
    assetScale: {
      score: score.dimensions.assetScale,
      detail: getAssetScaleDetail(data),
    },
    positionStability: {
      score: score.dimensions.positionStability,
      detail: getStabilityDetail(data),
    },
    repaymentHistory: {
      score: score.dimensions.repaymentHistory,
      detail: getRepaymentDetail(data),
    },
    multichain: {
      score: score.dimensions.multichain,
      detail: getMultichainDetail(data),
    },
  };
}

export async function buildCreditAnalysis(
  data: RawWalletData,
  score?: Score
): Promise<CreditAnalysis> {
  const resolvedScore = score ?? (await computeScore(data));

  return {
    wallet: resolvedScore.wallet,
    score: resolvedScore.score,
    tier: resolvedScore.tier,
    dimensions: buildDimensionDetails(data, resolvedScore),
    improvementTips: getImprovementTips(resolvedScore.dimensions),
    credential: null,
    computedAt: resolvedScore.computedAt,
    expiresAt: resolvedScore.expiresAt,
    ...(resolvedScore.dataGaps ? { dataGaps: resolvedScore.dataGaps } : {}),
  };
}

export async function analyzeWalletCredit(wallet: string): Promise<CreditAnalysis> {
  const data = await loadRawWalletData(wallet);
  return buildCreditAnalysis(data);
}
