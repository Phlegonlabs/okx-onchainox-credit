import { createHash } from 'node:crypto';

export function createWalletHash(wallet: string): string {
  return createHash('sha256').update(wallet.toLowerCase()).digest('hex');
}
