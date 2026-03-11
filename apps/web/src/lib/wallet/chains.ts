import type { Chain } from 'viem';
import { arbitrum, base, bsc, mainnet, optimism } from 'viem/chains';

export const xLayer: Chain = {
  id: 196,
  name: 'X Layer',
  nativeCurrency: {
    name: 'OKB',
    symbol: 'OKB',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.xlayer.tech'],
    },
    public: {
      http: ['https://rpc.xlayer.tech'],
    },
  },
  blockExplorers: {
    default: {
      name: 'OKLink',
      url: 'https://www.oklink.com/xlayer',
    },
  },
  testnet: false,
};

export const supportedChains = [mainnet, arbitrum, optimism, base, bsc, xLayer] as const;

export const defaultWalletChain = mainnet;

export function findSupportedChain(chainId: number): Chain | undefined {
  return supportedChains.find((chain) => chain.id === chainId);
}

export function toCaipChainId(chainId: number): string {
  return `eip155:${chainId}`;
}

export const okxConnectNamespaces = {
  eip155: {
    chains: supportedChains.map((chain) => toCaipChainId(chain.id)),
    defaultChain: defaultWalletChain.id.toString(),
    rpcMap: Object.fromEntries(
      supportedChains.map((chain) => [chain.id.toString(), chain.rpcUrls.default.http[0]])
    ),
  },
} as const;
