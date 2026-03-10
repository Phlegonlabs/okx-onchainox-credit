import { loadRawWalletData } from './lib/wallet-data.js';
import { computeScore } from './scorer.js';
import type { Score } from './types.js';

export async function getWalletScore(wallet: string): Promise<Score> {
  const data = await loadRawWalletData(wallet);
  return computeScore(data);
}
