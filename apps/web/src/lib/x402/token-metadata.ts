import type { X402TokenSymbol } from './config';

const TOKEN_DOMAIN_METADATA: Record<
  X402TokenSymbol,
  { domainName: string; domainVersion?: string }
> = {
  USDC: {
    domainName: 'USD Coin',
    domainVersion: '2',
  },
  USDG: {
    domainName: 'USDG',
  },
  USDT: {
    domainName: 'USD₮0',
    domainVersion: '1',
  },
  USDT0: {
    domainName: 'USD₮0',
    domainVersion: '1',
  },
};

export function getX402TokenDomainMetadata(token: X402TokenSymbol) {
  return TOKEN_DOMAIN_METADATA[token];
}
