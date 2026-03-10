import type { WalletEvent } from '../types.js';
import type { OkxRawTx } from './defi-parser.js';

const SWAP_METHOD_IDS = new Set(['0x38ed1739', '0x18cbafe5', '0x5c11d795', '0x7ff36ab5']);

export interface OkxTransactionPage {
  cursor?: string;
  transactionList: OkxRawTx[];
}

export interface NormalizedWalletHistoryPage {
  activeChains: string[];
  events: WalletEvent[];
  nextCursor?: string;
  oldestEventTimestamp?: number;
}

function toNumber(value: string | number | undefined): number {
  const parsed = typeof value === 'number' ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function mapWalletEventType(transaction: OkxRawTx): WalletEvent['type'] {
  if (transaction.methodId && SWAP_METHOD_IDS.has(transaction.methodId.toLowerCase())) {
    return 'swap';
  }

  if (transaction.itype === '0' || transaction.itype === '1' || transaction.itype === '2') {
    return 'transfer';
  }

  if (transaction.methodId === '0xa9059cbb') {
    return 'transfer';
  }

  return 'other';
}

export function normalizeWalletEvent(transaction: OkxRawTx): WalletEvent {
  const amount = toNumber(transaction.amount);
  const tokenPrice = transaction.to[0]?.amount ? toNumber(transaction.to[0].amount) : 0;
  const valueUsd = amount > 0 && tokenPrice > 0 ? amount * tokenPrice : undefined;
  const event: WalletEvent = {
    hash: transaction.txHash,
    chainId: transaction.chainIndex,
    type: mapWalletEventType(transaction),
    timestamp: Math.floor(toNumber(transaction.txTime) / 1_000),
  };

  if (valueUsd !== undefined) {
    event.valueUsd = valueUsd;
  }

  return event;
}

export function extractTransactionPage(data: unknown): OkxTransactionPage {
  if (!Array.isArray(data) || data.length === 0) {
    return { transactionList: [] };
  }

  const [first] = data;
  if (
    first &&
    typeof first === 'object' &&
    'transactionList' in first &&
    Array.isArray((first as { transactionList?: unknown }).transactionList)
  ) {
    const page = first as { cursor?: string; transactionList: OkxRawTx[] };
    return page.cursor
      ? {
          cursor: page.cursor,
          transactionList: page.transactionList,
        }
      : {
          transactionList: page.transactionList,
        };
  }

  const cursor =
    typeof (first as { cursor?: unknown })?.cursor === 'string'
      ? ((first as { cursor?: string }).cursor ?? undefined)
      : undefined;

  return cursor
    ? {
        transactionList: data as OkxRawTx[],
        cursor,
      }
    : {
        transactionList: data as OkxRawTx[],
      };
}

export function normalizeWalletHistoryPage(data: unknown): NormalizedWalletHistoryPage {
  const page = extractTransactionPage(data);
  const events = page.transactionList
    .filter((transaction) => transaction.txStatus === 'success')
    .map(normalizeWalletEvent);

  const activeChains = [...new Set(events.map((event) => event.chainId))];
  const timestamps = events.map((event) => event.timestamp);
  const normalizedPage: NormalizedWalletHistoryPage = {
    events,
    activeChains,
  };

  if (page.cursor) {
    normalizedPage.nextCursor = page.cursor;
  }

  if (timestamps.length > 0) {
    normalizedPage.oldestEventTimestamp = Math.min(...timestamps);
  }

  return normalizedPage;
}
