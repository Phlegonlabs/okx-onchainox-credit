import { createLocalMockScore, isLocalMockMode } from '@/lib/local-integration';
import { OkxClient, type RawWalletData } from '@okx-credit/scoring';
import { resolveScoreWithCache } from './score-cache';

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

function createLocalMockWalletData(wallet: string): RawWalletData {
  return {
    wallet,
    events: [],
    defiEvents: [],
    positions: [],
    totalValueUsd: 0,
    hasDeFiPositions: false,
    activeChains: [],
  };
}

export async function resolveWalletScore(wallet: string) {
  if (isLocalMockMode()) {
    return resolveScoreWithCache({
      wallet,
      walletDataLoader: async () => createLocalMockWalletData(wallet),
      // Persist mock scores so local end-to-end checks exercise the same cache tables as live mode.
      scoreComputer: async () => createLocalMockScore(wallet),
    });
  }

  return resolveScoreWithCache({
    wallet,
    walletDataLoader: async () => loadRawWalletData(wallet),
  });
}
