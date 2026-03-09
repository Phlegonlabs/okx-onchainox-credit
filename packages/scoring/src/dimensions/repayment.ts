// Dimension: DeFi repayment history (0-100).
//
// Scoring logic:
//   No DeFi activity at all → 50 (neutral; absence of bad behaviour ≠ negative)
//   Has DeFi activity:
//     base  = repaidBorrows / totalBorrows × 70 + 20   (range 20–90)
//     deduct 20pts per liquidation (max deduction 40pts)
//     bonus  +10 if active on ≥2 distinct DeFi protocols (diversified usage)
//   Final: clamp to [0, 100]
//
// Rationale:
//   - A wallet that only deposits (no borrows) still scores 50: good behaviour,
//     but no credit history to evaluate.
//   - A wallet with 100% repayment and no liquidations scores ~90–100.
//   - Each liquidation is a hard signal of over-leverage → heavy penalty.

import { summarizeDefiEvents } from '../lib/defi-parser.js';
import type { RawWalletData } from '../types.js';

export function scoreRepayment(data: RawWalletData): number {
  const { defiEvents, hasDeFiPositions } = data;

  // No lending history at all
  if (defiEvents.length === 0 && !hasDeFiPositions) return 50;

  const summary = summarizeDefiEvents(defiEvents);

  // Has DeFi positions or deposits but never borrowed → slight positive signal
  if (summary.totalBorrows === 0) {
    return summary.totalDeposits > 0 ? 60 : 50;
  }

  // Repayment rate (0–1)
  const repayRate = summary.repaidBorrows / summary.totalBorrows;

  // Base score: 20 (zero repayment) → 90 (full repayment)
  const base = Math.round(20 + repayRate * 70);

  // Liquidation penalty: −20 per event, capped at −40
  const liquidationPenalty = Math.min(summary.liquidations * 20, 40);

  // Protocol diversity bonus: +10 if borrowed from ≥2 different protocols
  const diversityBonus = summary.protocols.length >= 2 ? 10 : 0;

  return Math.max(0, Math.min(100, base - liquidationPenalty + diversityBonus));
}
