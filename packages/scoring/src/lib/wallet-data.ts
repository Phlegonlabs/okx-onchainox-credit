import type { RawWalletData } from '../types.js';
import { OkxClient } from './okx-client.js';

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
  const [events, walletPortfolio, defiPositionSnapshot, defiEvents] = await Promise.all([
    client.getWalletHistory(wallet),
    client.getWalletPortfolio(wallet),
    client.getDeFiPositions(wallet),
    client.getDeFiHistory(wallet),
  ]);
  const oldestEventTimestamp = getOldestEventTimestamp(events);

  return {
    activeChains: collectActiveChains({
      defiEvents,
      events,
      positions: walletPortfolio.positions,
    }),
    defiEvents,
    events,
    hasDeFiPositions: defiPositionSnapshot.hasPositions,
    positions: walletPortfolio.positions,
    totalValueUsd: walletPortfolio.totalValueUsd,
    wallet,
    ...(oldestEventTimestamp === undefined ? {} : { oldestEventTimestamp }),
  };
}
