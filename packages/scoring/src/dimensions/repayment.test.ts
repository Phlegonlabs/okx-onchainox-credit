import { describe, expect, it } from 'vitest';
import { createRawWalletData } from '../test-support/raw-wallet-data.js';
import type { DeFiEvent } from '../types.js';
import { scoreRepayment } from './repayment.js';

function createDefiEvent(overrides: Partial<DeFiEvent>): DeFiEvent {
  return {
    txHash: '0xtx',
    chainId: '1',
    protocol: 'aave-v3',
    protocolName: 'Aave V3',
    eventType: 'borrow',
    timestamp: 1,
    ...overrides,
  };
}

describe('scoreRepayment', () => {
  it('returns neutral when there is no DeFi credit history', () => {
    expect(
      scoreRepayment(
        createRawWalletData({
          defiEvents: [],
          hasDeFiPositions: false,
        })
      )
    ).toBe(50);
  });

  it('rewards complete repayments across multiple protocols', () => {
    expect(
      scoreRepayment(
        createRawWalletData({
          defiEvents: [
            createDefiEvent({ eventType: 'borrow', protocol: 'aave-v3', timestamp: 1 }),
            createDefiEvent({ eventType: 'repay', protocol: 'aave-v3', timestamp: 2 }),
            createDefiEvent({
              eventType: 'borrow',
              protocol: 'compound-v3',
              protocolName: 'Compound V3',
              timestamp: 3,
            }),
            createDefiEvent({
              eventType: 'repay',
              protocol: 'compound-v3',
              protocolName: 'Compound V3',
              timestamp: 4,
            }),
          ],
          hasDeFiPositions: true,
        })
      )
    ).toBe(100);
  });

  it('applies strong penalties for liquidations', () => {
    expect(
      scoreRepayment(
        createRawWalletData({
          defiEvents: [
            createDefiEvent({ eventType: 'borrow', timestamp: 1 }),
            createDefiEvent({ eventType: 'repay', timestamp: 2 }),
            createDefiEvent({ eventType: 'liquidated', timestamp: 3 }),
          ],
          hasDeFiPositions: true,
        })
      )
    ).toBe(70);
  });
});
