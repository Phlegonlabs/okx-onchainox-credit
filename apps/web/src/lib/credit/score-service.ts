import { createLocalMockScore, isLocalMockMode } from '@/lib/local-integration';
import {
  OkxClient,
  type RawWalletData,
  computeScore,
  loadRawWalletData as loadScoringWalletData,
} from '@okx-credit/scoring';
import { resolveScoreWithCache } from './score-cache';

export async function loadRawWalletData(
  wallet: string,
  client = OkxClient.fromEnv()
): ReturnType<typeof loadScoringWalletData> {
  return loadScoringWalletData(wallet, client);
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

export async function computeLiveWalletScore(wallet: string, client = OkxClient.fromEnv()) {
  if (isLocalMockMode()) {
    return createLocalMockScore(wallet);
  }

  const walletData = await loadRawWalletData(wallet, client);
  return computeScore(walletData);
}
