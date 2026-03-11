import { getAddress, isAddress } from 'viem';

export interface TargetWalletResolution {
  errorMessage: string | null;
  normalizedWallet: string | null;
}

export function resolveTargetWalletInput(value: string): TargetWalletResolution {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return {
      errorMessage: 'Enter a wallet address to investigate.',
      normalizedWallet: null,
    };
  }

  if (!isAddress(trimmedValue)) {
    return {
      errorMessage: 'Enter a valid EVM wallet address.',
      normalizedWallet: null,
    };
  }

  return {
    errorMessage: null,
    normalizedWallet: getAddress(trimmedValue),
  };
}
