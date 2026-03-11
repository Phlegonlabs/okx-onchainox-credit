import type { SessionTypes } from '@okxconnect/ui';
import { describe, expect, it } from 'vitest';
import {
  buildPersonalSignParams,
  buildSnapshotFromSession,
  parseSessionAccount,
  parseWalletChainId,
} from './okx-wallet';

describe('okx wallet helpers', () => {
  it('parses decimal, hex, and caip chain ids', () => {
    expect(parseWalletChainId(196)).toBe(196);
    expect(parseWalletChainId('8453')).toBe(8453);
    expect(parseWalletChainId('0xc4')).toBe(196);
    expect(parseWalletChainId('eip155:1')).toBe(1);
  });

  it('returns null for invalid chain values', () => {
    expect(parseWalletChainId(undefined)).toBeNull();
    expect(parseWalletChainId('chain:abc')).toBeNull();
    expect(parseWalletChainId('invalid')).toBeNull();
  });

  it('extracts account and chain id from an eip155 session account', () => {
    expect(parseSessionAccount('eip155:196:0x1234')).toEqual({
      address: '0x1234',
      chainId: 196,
    });
    expect(parseSessionAccount('solana:mainnet:wallet')).toEqual({
      address: null,
      chainId: null,
    });
  });

  it('builds a wallet snapshot from an okx connect session', () => {
    const session = {
      namespaces: {
        eip155: {
          accounts: ['eip155:8453:0x1234567890abcdef1234567890abcdef12345678'],
          chains: ['eip155:8453'],
          defaultChain: '8453',
          methods: [],
          events: [],
        },
      },
    } as unknown as SessionTypes.Struct;

    expect(buildSnapshotFromSession(session)).toEqual({
      address: '0x1234567890abcdef1234567890abcdef12345678',
      chainId: 8453,
      connectorType: 'app',
    });
  });

  it('returns null when the session does not expose an eip155 account', () => {
    const session = {
      namespaces: {
        eip155: {
          accounts: [],
          chains: ['eip155:1'],
          defaultChain: '1',
          methods: [],
          events: [],
        },
      },
    } as unknown as SessionTypes.Struct;

    expect(buildSnapshotFromSession(session)).toBeNull();
  });

  it('encodes personal sign payloads as hex challenge plus address', () => {
    expect(buildPersonalSignParams('hello', '0xabc')).toEqual(['0x68656c6c6f', '0xabc']);
  });
});
