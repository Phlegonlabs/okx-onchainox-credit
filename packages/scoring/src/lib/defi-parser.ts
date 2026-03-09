// DeFi event parser — converts raw OKX transaction data into structured DeFiEvent[].
//
// Flow:
//   OKX raw tx (from /api/v6/dex/post-transaction/transactions-by-address)
//   → match to[].address against defi-registry contract index
//   → classify event type via methodId
//   → emit DeFiEvent
//
// Used by: OkxClient.getDeFiHistory(), repayment dimension scorer.

import type { DeFiEvent } from '../types.js';
import { classifySelector, lookupProtocol } from './defi-registry.js';
import type { DeFiEventType } from './defi-registry.js';

// Raw shape returned by OKX /api/v6/dex/post-transaction/transactions-by-address
export interface OkxRawTx {
  chainIndex: string;
  txHash: string;
  txTime: string; // Unix ms string
  itype?: string;
  txStatus: string; // "success" | "fail" | "pending"
  methodId?: string; // contract function selector, e.g. "0x573ade81"
  from: Array<{ address: string; amount: string }>;
  to: Array<{ address: string; amount: string }>;
  tokenContractAddress?: string;
  amount?: string;
  symbol?: string;
}

export function parseDefiEvents(txList: OkxRawTx[]): DeFiEvent[] {
  const events: DeFiEvent[] = [];

  for (const tx of txList) {
    if (tx.txStatus !== 'success') continue;
    if (!tx.methodId) continue;

    const chainId = tx.chainIndex;

    // Check each `to` address against the protocol contract registry
    for (const recipient of tx.to) {
      const protocol = lookupProtocol(chainId, recipient.address);
      if (!protocol) continue;

      const eventType: DeFiEventType = classifySelector(protocol, tx.methodId);
      const event: DeFiEvent = {
        txHash: tx.txHash,
        chainId,
        protocol: protocol.key,
        protocolName: protocol.name,
        eventType,
        timestamp: Math.floor(Number(tx.txTime) / 1000), // ms → seconds
      };

      if (tx.symbol) {
        event.assetSymbol = tx.symbol;
      }

      events.push(event);

      break; // one DeFi event per tx is sufficient
    }
  }

  return events;
}

// ── Derived analytics ─────────────────────────────────────────────────────────

export interface DefiSummary {
  totalBorrows: number;
  totalRepays: number;
  totalDeposits: number;
  liquidations: number;
  protocols: string[]; // distinct protocol keys active
  repaidBorrows: number; // borrows that have a subsequent repay (same protocol+chain)
}

export function summarizeDefiEvents(events: DeFiEvent[]): DefiSummary {
  const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);

  const borrows = sorted.filter((e) => e.eventType === 'borrow');
  const repays = sorted.filter((e) => e.eventType === 'repay');
  const deposits = sorted.filter((e) => e.eventType === 'deposit');
  const liquidations = sorted.filter((e) => e.eventType === 'liquidated');

  // Count borrows that have at least one subsequent repay on the same protocol+chain
  let repaidBorrows = 0;
  for (const borrow of borrows) {
    const key = `${borrow.protocol}:${borrow.chainId}`;
    const hasRepay = repays.some(
      (r) => r.timestamp > borrow.timestamp && `${r.protocol}:${r.chainId}` === key
    );
    if (hasRepay) repaidBorrows++;
  }

  const protocols = [...new Set(events.map((e) => e.protocol))];

  return {
    totalBorrows: borrows.length,
    totalRepays: repays.length,
    totalDeposits: deposits.length,
    liquidations: liquidations.length,
    protocols,
    repaidBorrows,
  };
}
