// DeFi protocol registry — contract addresses per chain + method selectors.
// Primary matching: contract address (reliable).
// Secondary matching: methodId (for event type classification).
//
// To add a new protocol: add an entry to PROTOCOLS below.
// Contract addresses: always lowercase.
// Selectors: VERIFY against protocol ABI before shipping.

export type DeFiEventType =
  | 'borrow'
  | 'repay'
  | 'deposit'
  | 'withdraw'
  | 'liquidated'
  | 'other_defi';

export interface ProtocolDef {
  key: string; // machine key used in DeFiEvent.protocol
  name: string; // display name
  contracts: Record<string, string[]>; // chainId → contract addresses (lowercase)
  selectors: Record<string, DeFiEventType>; // methodId (0x...) → event type
}

// ── Protocol definitions ──────────────────────────────────────────────────────

export const PROTOCOLS: ProtocolDef[] = [
  {
    key: 'aave-v3',
    name: 'Aave V3',
    contracts: {
      '1': ['0x87870bca3f3fd6335c3f4ce8392d69350b4fa4e2'], // Ethereum
      '42161': ['0x794a61358d6845594f94dc1db02a252b5b4814ad'], // Arbitrum
      '10': ['0x794a61358d6845594f94dc1db02a252b5b4814ad'], // Optimism
      '8453': ['0xa238dd80c259a72e81d7e4664a9801593f98d1c5'], // Base
      '137': ['0x794a61358d6845594f94dc1db02a252b5b4814ad'], // Polygon
      '43114': ['0x794a61358d6845594f94dc1db02a252b5b4814ad'], // Avalanche
    },
    selectors: {
      '0x617ba037': 'deposit', // supply(address,uint256,address,uint16)
      '0x69328dec': 'withdraw', // withdraw(address,uint256,address)
      '0xa415bcad': 'borrow', // borrow(address,uint256,uint256,uint16,address)
      '0x573ade81': 'repay', // repay(address,uint256,uint256,address)
      '0x00a718a9': 'liquidated', // liquidationCall(address,address,address,uint256,bool)
    },
  },

  {
    key: 'aave-v2',
    name: 'Aave V2',
    contracts: {
      '1': ['0x7d2768de32b0b80b7a3454c06bdac94a69ddc7a9'], // Ethereum LendingPool
    },
    selectors: {
      '0xe8eda9df': 'deposit', // deposit(address,uint256,address,uint16)
      '0x69328dec': 'withdraw', // withdraw(address,uint256,address)
      '0xc858f5f9': 'borrow', // borrow(address,uint256,uint256,uint16,address)
      '0x573ade81': 'repay', // repay(address,uint256,uint256,address)
      '0x00a718a9': 'liquidated', // liquidationCall(...)
    },
  },

  {
    key: 'compound-v3',
    name: 'Compound V3',
    contracts: {
      '1': [
        '0xc3d688b66703497daa19211eedff47f25384cdc3', // cUSDCv3
        '0xa17581a9e3356d9a858b789d68b4d866e593ae94', // cWETHv3
      ],
      '42161': ['0x9c4ec768c28520b50860ea7a15bd7213a9ff58bf'], // Arbitrum
      '8453': ['0xb125e6687d4313864e53df431d5425969c15eb2'], // Base
      '137': ['0xf25212e676d1f7f89cd72ffee66158f541246445'], // Polygon
    },
    selectors: {
      '0xf2b9fdb8': 'deposit', // supply(address,uint256)
      '0xf3fef3a3': 'withdraw', // withdraw(address,uint256)
      '0xd65cf509': 'borrow', // withdrawTo(address,address,uint256) — used for borrows
      '0xa0712d68': 'repay', // supply to repay (same selector, context = repay)
      '0xa0c76a96': 'liquidated', // absorb(address,address[])
    },
  },

  {
    key: 'morpho-blue',
    name: 'Morpho Blue',
    contracts: {
      '1': ['0xbbbbbbbb9cc5e90e3b3af64bdaf62c37eeffcb'], // Ethereum
      '8453': ['0xbbbbbbbb9cc5e90e3b3af64bdaf62c37eeffcb'], // Base
    },
    selectors: {
      '0xa99aad89': 'deposit', // supply(MarketParams,uint256,uint256,address,bytes)
      '0x50d8cd4b': 'borrow', // borrow(MarketParams,uint256,uint256,address,address)
      '0x20d9d0c8': 'repay', // repay(MarketParams,uint256,uint256,address,bytes)
      '0xd8eabcb8': 'liquidated', // liquidate(MarketParams,address,uint256,uint256,bytes)
    },
  },

  {
    key: 'spark',
    name: 'Spark Protocol',
    contracts: {
      '1': ['0xc13e21b648a5ee794902342038ff3adab66be987'], // Ethereum (Aave V3 fork)
    },
    selectors: {
      '0x617ba037': 'deposit',
      '0x69328dec': 'withdraw',
      '0xa415bcad': 'borrow',
      '0x573ade81': 'repay',
      '0x00a718a9': 'liquidated',
    },
  },
];

// ── Lookup helpers ────────────────────────────────────────────────────────────

/** Flat map: `${chainId}:${address}` → ProtocolDef */
const CONTRACT_INDEX = new Map<string, ProtocolDef>();

for (const protocol of PROTOCOLS) {
  for (const [chainId, addresses] of Object.entries(protocol.contracts)) {
    for (const addr of addresses) {
      CONTRACT_INDEX.set(`${chainId}:${addr.toLowerCase()}`, protocol);
    }
  }
}

export function lookupProtocol(chainId: string, contractAddress: string): ProtocolDef | undefined {
  return CONTRACT_INDEX.get(`${chainId}:${contractAddress.toLowerCase()}`);
}

export function classifySelector(protocol: ProtocolDef, methodId: string): DeFiEventType {
  return protocol.selectors[methodId.toLowerCase()] ?? 'other_defi';
}
