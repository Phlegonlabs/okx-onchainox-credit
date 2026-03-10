import { describe, expect, it } from 'vitest';
import type { DeFiEvent } from '../types.js';
import { type OkxRawTx, parseDefiEvents, summarizeDefiEvents } from './defi-parser.js';

// Aave V3 on Ethereum — exists in the registry
const AAVE_V3_ETH = '0x87870bca3f3fd6335c3f4ce8392d69350b4fa4e2';
const CHAIN_ETH = '1';

function makeTx(overrides: Partial<OkxRawTx> = {}): OkxRawTx {
  return {
    chainIndex: CHAIN_ETH,
    from: [{ address: '0xuser', amount: '1000' }],
    methodId: '0x617ba037', // Aave V3 supply → deposit
    to: [{ address: AAVE_V3_ETH, amount: '1000' }],
    txHash: '0xhash1',
    txStatus: 'success',
    txTime: '1700000000000',
    ...overrides,
  };
}

describe('parseDefiEvents', () => {
  it('parses a deposit event on a known protocol', () => {
    const events = parseDefiEvents([makeTx()]);

    expect(events).toMatchObject([
      {
        chainId: CHAIN_ETH,
        eventType: 'deposit',
        protocol: 'aave-v3',
        protocolName: 'Aave V3',
        txHash: '0xhash1',
      },
    ]);
  });

  it('converts txTime from ms to seconds', () => {
    const events = parseDefiEvents([makeTx({ txTime: '1700000000000' })]);

    expect(events).toMatchObject([{ timestamp: 1_700_000_000 }]);
  });

  it('attaches assetSymbol when present', () => {
    const events = parseDefiEvents([makeTx({ symbol: 'USDC' })]);

    expect(events).toMatchObject([{ assetSymbol: 'USDC' }]);
  });

  it('parses a borrow event via methodId', () => {
    const events = parseDefiEvents([makeTx({ methodId: '0xa415bcad' })]); // Aave V3 borrow

    expect(events).toMatchObject([{ eventType: 'borrow' }]);
  });

  it('parses a repay event via methodId', () => {
    const events = parseDefiEvents([makeTx({ methodId: '0x573ade81' })]); // Aave V3 repay

    expect(events).toMatchObject([{ eventType: 'repay' }]);
  });

  it('parses a liquidated event via methodId', () => {
    const events = parseDefiEvents([makeTx({ methodId: '0x00a718a9' })]); // Aave V3 liquidate

    expect(events).toMatchObject([{ eventType: 'liquidated' }]);
  });

  it('emits other_defi for unknown methodId on a known contract', () => {
    const events = parseDefiEvents([makeTx({ methodId: '0xdeadbeef' })]);

    expect(events).toMatchObject([{ eventType: 'other_defi' }]);
  });

  it('skips failed transactions', () => {
    const events = parseDefiEvents([makeTx({ txStatus: 'fail' })]);

    expect(events).toHaveLength(0);
  });

  it('skips pending transactions', () => {
    const events = parseDefiEvents([makeTx({ txStatus: 'pending' })]);

    expect(events).toHaveLength(0);
  });

  it('skips transactions without a methodId', () => {
    const tx: OkxRawTx = {
      chainIndex: CHAIN_ETH,
      from: [{ address: '0xuser', amount: '1000' }],
      to: [{ address: AAVE_V3_ETH, amount: '1000' }],
      txHash: '0xhash2',
      txStatus: 'success',
      txTime: '1700000000000',
    };
    const events = parseDefiEvents([tx]);

    expect(events).toHaveLength(0);
  });

  it('skips transactions to unknown contracts', () => {
    const events = parseDefiEvents([makeTx({ to: [{ address: '0xunknown', amount: '0' }] })]);

    expect(events).toHaveLength(0);
  });

  it('emits at most one event per transaction', () => {
    // Both to-addresses are known contracts — should only emit once
    const tx = makeTx({
      to: [
        { address: AAVE_V3_ETH, amount: '1000' },
        { address: AAVE_V3_ETH, amount: '2000' },
      ],
    });
    const events = parseDefiEvents([tx]);

    expect(events).toHaveLength(1);
  });

  it('handles an empty list', () => {
    expect(parseDefiEvents([])).toEqual([]);
  });
});

describe('summarizeDefiEvents', () => {
  function makeEvent(
    eventType: DeFiEvent['eventType'],
    timestamp: number,
    protocol = 'aave-v3',
    chainId = '1'
  ): DeFiEvent {
    return {
      chainId,
      eventType,
      protocol,
      protocolName: 'Aave V3',
      timestamp,
      txHash: `0x${timestamp}`,
    };
  }

  it('counts borrows, repays, deposits, and liquidations', () => {
    const events = [
      makeEvent('borrow', 100),
      makeEvent('borrow', 200),
      makeEvent('repay', 300),
      makeEvent('deposit', 50),
      makeEvent('liquidated', 400),
    ];
    const summary = summarizeDefiEvents(events);

    expect(summary.totalBorrows).toBe(2);
    expect(summary.totalRepays).toBe(1);
    expect(summary.totalDeposits).toBe(1);
    expect(summary.liquidations).toBe(1);
  });

  it('counts repaidBorrows for borrows with a subsequent repay on the same protocol+chain', () => {
    const events = [
      makeEvent('borrow', 100, 'aave-v3', '1'),
      makeEvent('repay', 200, 'aave-v3', '1'),
    ];
    const summary = summarizeDefiEvents(events);

    expect(summary.repaidBorrows).toBe(1);
  });

  it('does not count repaid if repay is on a different protocol', () => {
    const events = [
      makeEvent('borrow', 100, 'aave-v3', '1'),
      makeEvent('repay', 200, 'compound-v3', '1'),
    ];
    const summary = summarizeDefiEvents(events);

    expect(summary.repaidBorrows).toBe(0);
  });

  it('does not count repaid if repay is on a different chain', () => {
    const events = [
      makeEvent('borrow', 100, 'aave-v3', '1'),
      makeEvent('repay', 200, 'aave-v3', '42161'),
    ];
    const summary = summarizeDefiEvents(events);

    expect(summary.repaidBorrows).toBe(0);
  });

  it('does not count repaid if repay precedes borrow', () => {
    const events = [
      makeEvent('repay', 50, 'aave-v3', '1'),
      makeEvent('borrow', 100, 'aave-v3', '1'),
    ];
    const summary = summarizeDefiEvents(events);

    expect(summary.repaidBorrows).toBe(0);
  });

  it('lists distinct protocol keys', () => {
    const events = [
      makeEvent('borrow', 100, 'aave-v3', '1'),
      makeEvent('repay', 200, 'aave-v3', '1'),
      makeEvent('deposit', 300, 'compound-v3', '1'),
    ];
    const summary = summarizeDefiEvents(events);

    expect(summary.protocols.sort()).toEqual(['aave-v3', 'compound-v3']);
  });

  it('returns zero totals for an empty list', () => {
    const summary = summarizeDefiEvents([]);

    expect(summary.totalBorrows).toBe(0);
    expect(summary.totalRepays).toBe(0);
    expect(summary.totalDeposits).toBe(0);
    expect(summary.liquidations).toBe(0);
    expect(summary.repaidBorrows).toBe(0);
    expect(summary.protocols).toEqual([]);
  });
});
