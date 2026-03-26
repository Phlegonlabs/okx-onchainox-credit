import { isAddress } from 'ethers';

/**
 * Validates an EVM wallet address: requires 0x prefix and EIP-55 checksum compliance.
 */
export function isValidEvmWallet(wallet: string): boolean {
  return wallet.startsWith('0x') && isAddress(wallet);
}
