import type { Chain } from 'viem';
import { arbitrum, base, bsc, mainnet, optimism } from 'wagmi/chains';

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
