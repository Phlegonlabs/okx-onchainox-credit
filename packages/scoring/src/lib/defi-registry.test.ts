import { describe, expect, it } from 'vitest';
import { PROTOCOLS, classifySelector, lookupProtocol } from './defi-registry.js';

describe('lookupProtocol', () => {
  it('finds Aave V3 on Ethereum by contract address', () => {
    const protocol = lookupProtocol('1', '0x87870bca3f3fd6335c3f4ce8392d69350b4fa4e2');

    expect(protocol).toBeDefined();
    expect(protocol?.key).toBe('aave-v3');
    expect(protocol?.name).toBe('Aave V3');
  });

  it('finds Aave V3 on Arbitrum', () => {
    const protocol = lookupProtocol('42161', '0x794a61358d6845594f94dc1db02a252b5b4814ad');

    expect(protocol?.key).toBe('aave-v3');
  });

  it('finds Compound V3 on Ethereum (cUSDCv3)', () => {
    const protocol = lookupProtocol('1', '0xc3d688b66703497daa19211eedff47f25384cdc3');

    expect(protocol?.key).toBe('compound-v3');
  });

  it('finds Morpho Blue on Base', () => {
    const protocol = lookupProtocol('8453', '0xbbbbbbbb9cc5e90e3b3af64bdaf62c37eeffcb');

    expect(protocol?.key).toBe('morpho-blue');
  });

  it('normalizes contract address to lowercase', () => {
    const lower = lookupProtocol('1', '0x87870bca3f3fd6335c3f4ce8392d69350b4fa4e2');
    const mixed = lookupProtocol('1', '0x87870BCA3F3fD6335C3F4cE8392D69350B4FA4E2');

    expect(lower).toBe(mixed);
  });

  it('returns undefined for an unknown contract address', () => {
    expect(lookupProtocol('1', '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef')).toBeUndefined();
  });

  it('returns undefined when chainId does not match', () => {
    // Aave V3 Ethereum address on wrong chain
    expect(lookupProtocol('56', '0x87870bca3f3fd6335c3f4ce8392d69350b4fa4e2')).toBeUndefined();
  });

  it('returns undefined for empty address', () => {
    expect(lookupProtocol('1', '')).toBeUndefined();
  });

  it('covers all protocols in PROTOCOLS list', () => {
    for (const protocol of PROTOCOLS) {
      for (const [chainId, addresses] of Object.entries(protocol.contracts)) {
        for (const addr of addresses) {
          const found = lookupProtocol(chainId, addr);
          expect(found?.key, `${protocol.key} on chain ${chainId} at ${addr}`).toBe(protocol.key);
        }
      }
    }
  });
});

describe('classifySelector', () => {
  const aaveV3 = PROTOCOLS.find((p) => p.key === 'aave-v3') as NonNullable<
    ReturnType<typeof PROTOCOLS.find>
  >;

  it('classifies a deposit selector', () => {
    expect(classifySelector(aaveV3, '0x617ba037')).toBe('deposit');
  });

  it('classifies a withdraw selector', () => {
    expect(classifySelector(aaveV3, '0x69328dec')).toBe('withdraw');
  });

  it('classifies a borrow selector', () => {
    expect(classifySelector(aaveV3, '0xa415bcad')).toBe('borrow');
  });

  it('classifies a repay selector', () => {
    expect(classifySelector(aaveV3, '0x573ade81')).toBe('repay');
  });

  it('classifies a liquidation selector', () => {
    expect(classifySelector(aaveV3, '0x00a718a9')).toBe('liquidated');
  });

  it('normalizes methodId to lowercase before lookup', () => {
    expect(classifySelector(aaveV3, '0x617BA037')).toBe('deposit');
  });

  it('returns other_defi for an unknown selector', () => {
    expect(classifySelector(aaveV3, '0xdeadbeef')).toBe('other_defi');
  });

  it('returns other_defi for an empty methodId', () => {
    expect(classifySelector(aaveV3, '')).toBe('other_defi');
  });
});
