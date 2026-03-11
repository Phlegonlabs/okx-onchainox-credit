import type { RawWalletData } from '../types.js';
import { parseDefiEvents } from './defi-parser.js';
import { OkxClient } from './okx-client.js';
import { normalizeWalletHistoryTransactions } from './wallet-normalizer.js';

function getOldestEventTimestamp(events: RawWalletData['events']): number | undefined {
  return events.reduce<number | undefined>((oldest, event) => {
    if (oldest === undefined || event.timestamp < oldest) {
      return event.timestamp;
    }

    return oldest;
  }, undefined);
}

function collectActiveChains(data: {
  defiEvents: RawWalletData['defiEvents'];
  events: RawWalletData['events'];
  positions: RawWalletData['positions'];
}): string[] {
  return [
    ...new Set([
      ...data.events.map((event) => event.chainId),
      ...data.defiEvents.map((event) => event.chainId),
      ...data.positions.map((position) => position.chainId),
    ]),
  ];
}

export async function loadRawWalletData(
  wallet: string,
  client = OkxClient.fromEnv()
): Promise<RawWalletData> {
  const transactions = await client.getTransactionHistory(wallet);
  const normalizedHistory = normalizeWalletHistoryTransactions(transactions);
  const walletPortfolio = await client.getWalletPortfolio(wallet);
  const defiPositionSnapshot = await client.getDeFiPositions(wallet);
  const defiEvents = parseDefiEvents(transactions);
  const oldestEventTimestamp =
    normalizedHistory.oldestEventTimestamp ?? getOldestEventTimestamp(normalizedHistory.events);

  return {
    activeChains: collectActiveChains({
      defiEvents,
      events: normalizedHistory.events,
      positions: walletPortfolio.positions,
    }),
    defiEvents,
    events: normalizedHistory.events,
    hasDeFiPositions: defiPositionSnapshot.hasPositions,
    positions: walletPortfolio.positions,
    totalValueUsd: walletPortfolio.totalValueUsd,
    wallet,
    ...(oldestEventTimestamp === undefined ? {} : { oldestEventTimestamp }),
  };
}
