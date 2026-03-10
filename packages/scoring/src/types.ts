// All scoring interfaces — no runtime code.
import type { DeFiEventType } from './lib/defi-registry.js';

export type { DeFiEventType };

export type ScoreTier = 'excellent' | 'good' | 'fair' | 'poor';

export interface ScoreDimensions {
  walletAge: number; // 0-100
  assetScale: number; // 0-100
  positionStability: number; // 0-100
  repaymentHistory: number; // 0-100
  multichain: number; // 0-100
}

export interface Score {
  wallet: string;
  score: number; // 300-850
  tier: ScoreTier;
  dimensions: ScoreDimensions;
  computedAt: string; // ISO timestamp
  expiresAt: string; // ISO timestamp (computedAt + 24h)
  dataGaps?: string[]; // e.g. ['no_defi_history', 'wallet_age_unknown']
}

export interface CreditAnalysisDimension {
  detail: string;
  score: number;
}

export interface CreditAnalysisDimensions {
  walletAge: CreditAnalysisDimension;
  assetScale: CreditAnalysisDimension;
  positionStability: CreditAnalysisDimension;
  repaymentHistory: CreditAnalysisDimension;
  multichain: CreditAnalysisDimension;
}

export interface CreditImprovementTip {
  action: string;
  currentValue: number;
  dimensionKey: keyof ScoreDimensions;
  dimensionLabel: string;
  estimatedPointGain: number;
}

export interface CreditAnalysis {
  wallet: string;
  score: number;
  tier: ScoreTier;
  dimensions: CreditAnalysisDimensions;
  improvementTips: CreditImprovementTip[];
  credential: null;
  computedAt: string;
  expiresAt: string;
  dataGaps?: string[];
}

// Generic on-chain event (used for wallet age + activity scoring)
export interface WalletEvent {
  hash: string;
  chainId: string;
  type: 'transfer' | 'swap' | 'other';
  timestamp: number; // unix seconds
  valueUsd?: number;
}

// Parsed DeFi-specific event (output of defi-parser)
export interface DeFiEvent {
  txHash: string;
  chainId: string;
  protocol: string; // e.g. "aave-v3", "compound-v3"
  protocolName: string; // display name, e.g. "Aave V3"
  eventType: DeFiEventType; // borrow | repay | deposit | withdraw | liquidated | other_defi
  timestamp: number; // unix seconds
  assetSymbol?: string; // e.g. "USDC", "WETH"
}

export interface TokenPosition {
  tokenId: string;
  symbol: string;
  chainId: string;
  balanceUsd: number;
  firstAcquired?: number; // unix seconds
  priceHistory?: PriceCandle[];
}

export interface PriceCandle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface TokenPriceRequest {
  chainIndex: string;
  tokenContractAddress: string;
}

export interface TokenPriceQuote extends TokenPriceRequest {
  price: number;
  timestamp: number;
}

export interface DeFiPositionSnapshot {
  totalValueUsd: number;
  hasPositions: boolean;
}

export interface RawWalletData {
  wallet: string;
  events: WalletEvent[]; // all raw on-chain events (transfers, swaps)
  defiEvents: DeFiEvent[]; // parsed DeFi events from defi-parser
  positions: TokenPosition[];
  totalValueUsd: number;
  hasDeFiPositions: boolean; // true if assetType=2 query returns value > 0
  oldestEventTimestamp?: number; // unix seconds — earliest tx seen
  activeChains: string[]; // chainIndex values with any activity
}
