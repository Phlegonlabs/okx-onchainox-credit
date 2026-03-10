import { describe, expect, it } from 'vitest';
import { extractTransactionPage, normalizeWalletHistoryPage } from './wallet-normalizer.js';

describe('wallet normalizer', () => {
  it('extracts paginated OKX transaction pages', () => {
    expect(
      extractTransactionPage([
        {
          cursor: 'next-page',
          transactionList: [
            {
              chainIndex: '1',
              txHash: '0xhash-1',
              txTime: '1700000000000',
              txStatus: 'success',
              from: [{ address: '0xfrom', amount: '1' }],
              to: [{ address: '0xto', amount: '1' }],
            },
          ],
        },
      ])
    ).toEqual({
      cursor: 'next-page',
      transactionList: [
        {
          chainIndex: '1',
          txHash: '0xhash-1',
          txTime: '1700000000000',
          txStatus: 'success',
          from: [{ address: '0xfrom', amount: '1' }],
          to: [{ address: '0xto', amount: '1' }],
        },
      ],
    });
  });

  it('normalizes successful transactions into typed wallet events', () => {
    expect(
      normalizeWalletHistoryPage([
        {
          cursor: 'page-2',
          transactionList: [
            {
              chainIndex: '1',
              txHash: '0xhash-1',
              txTime: '1700000000000',
              itype: '2',
              txStatus: 'success',
              methodId: '0xa9059cbb',
              from: [{ address: '0xfrom', amount: '1' }],
              to: [{ address: '0xto', amount: '2' }],
              amount: '3',
            },
            {
              chainIndex: '10',
              txHash: '0xhash-2',
              txTime: '1700003600000',
              txStatus: 'fail',
              from: [{ address: '0xfrom', amount: '1' }],
              to: [{ address: '0xto', amount: '4' }],
            },
            {
              chainIndex: '8453',
              txHash: '0xhash-3',
              txTime: '1700007200000',
              txStatus: 'success',
              methodId: '0x38ed1739',
              from: [{ address: '0xfrom', amount: '1' }],
              to: [{ address: '0xto', amount: '4' }],
              amount: '2',
            },
          ],
        },
      ])
    ).toEqual({
      events: [
        {
          hash: '0xhash-1',
          chainId: '1',
          type: 'transfer',
          timestamp: 1700000000,
          valueUsd: 6,
        },
        {
          hash: '0xhash-3',
          chainId: '8453',
          type: 'swap',
          timestamp: 1700007200,
          valueUsd: 8,
        },
      ],
      activeChains: ['1', '8453'],
      nextCursor: 'page-2',
      oldestEventTimestamp: 1700000000,
    });
  });
});
