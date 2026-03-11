import { describe, expect, it } from 'vitest';
import { resolveTargetWalletInput } from './target-wallet';

describe('resolveTargetWalletInput', () => {
  it('rejects empty inputs', () => {
    expect(resolveTargetWalletInput('   ')).toEqual({
      errorMessage: 'Enter a wallet address to investigate.',
      normalizedWallet: null,
    });
  });

  it('rejects invalid wallet addresses', () => {
    expect(resolveTargetWalletInput('not-a-wallet')).toEqual({
      errorMessage: 'Enter a valid EVM wallet address.',
      normalizedWallet: null,
    });
  });

  it('returns a checksummed wallet for valid addresses', () => {
    expect(resolveTargetWalletInput('0x1234567890abcdef1234567890abcdef12345678')).toEqual({
      errorMessage: null,
      normalizedWallet: '0x1234567890AbcdEF1234567890aBcdef12345678',
    });
  });
});
