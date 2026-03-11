import { SiweMessage } from 'siwe';
import { getAddress } from 'viem';

export interface CreateSiweMessageInput {
  address: string;
  chainId: number;
  domain: string;
  nonce: string;
  uri: string;
}

export function createSiweMessage({
  address,
  chainId,
  domain,
  nonce,
  uri,
}: CreateSiweMessageInput): string {
  return new SiweMessage({
    address: getAddress(address),
    chainId,
    domain,
    nonce,
    statement: 'Sign in to OKX OnchainOS Credit.',
    uri,
    version: '1',
  }).prepareMessage();
}
