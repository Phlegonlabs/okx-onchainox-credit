import { afterEach, describe, expect, it, vi } from 'vitest';
import { OkxClient } from './okx-client.js';

const ORIGINAL_FETCH = globalThis.fetch;

function jsonResponse(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  globalThis.fetch = ORIGINAL_FETCH;
});

describe('OkxClient', () => {
  it('paginates wallet history and signs requests', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({
          code: '0',
          msg: '',
          data: [
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
                  to: [{ address: '0xto', amount: '1' }],
                  amount: '2',
                  symbol: 'ETH',
                },
              ],
            },
          ],
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          code: '0',
          msg: '',
          data: [
            {
              cursor: '',
              transactionList: [
                {
                  chainIndex: '10',
                  txHash: '0xhash-2',
                  txTime: '1700003600000',
                  txStatus: 'success',
                  methodId: '0x38ed1739',
                  from: [{ address: '0xfrom', amount: '1' }],
                  to: [{ address: '0xto', amount: '1' }],
                  amount: '5',
                  symbol: 'USDC',
                },
              ],
            },
          ],
        })
      );

    globalThis.fetch = fetchMock;

    const client = new OkxClient({
      apiKey: 'key',
      secretKey: 'secret',
      passphrase: 'pass',
    });

    const result = await client.getWalletHistory('0xabc');

    expect(result).toEqual([
      {
        hash: '0xhash-1',
        chainId: '1',
        type: 'transfer',
        timestamp: 1700000000,
        valueUsd: 2,
      },
      {
        hash: '0xhash-2',
        chainId: '10',
        type: 'swap',
        timestamp: 1700003600,
        valueUsd: 5,
      },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const [firstUrl, firstInit] = fetchMock.mock.calls[0] ?? [];
    expect(String(firstUrl)).toContain('/api/v6/dex/post-transaction/transactions-by-address');
    expect(String(firstUrl)).toContain('address=0xabc');
    expect(String(firstUrl)).toContain('limit=20');
    expect((firstInit?.headers as Record<string, string>)['OK-ACCESS-KEY']).toBe('key');
    expect((firstInit?.headers as Record<string, string>)['OK-ACCESS-SIGN']).toBeTruthy();
  });

  it('uses the larger history page size for single-chain requests', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({
        code: '0',
        msg: '',
        data: [
          {
            cursor: '',
            transactionList: [],
          },
        ],
      })
    );
    globalThis.fetch = fetchMock;

    const client = new OkxClient({
      apiKey: 'key',
      secretKey: 'secret',
      passphrase: 'pass',
    });

    await client.getWalletHistory('0xabc', '1');

    const [firstUrl] = fetchMock.mock.calls[0] ?? [];
    expect(String(firstUrl)).toContain('chains=1');
    expect(String(firstUrl)).toContain('limit=100');
  });

  it('returns a typed DeFi position snapshot', async () => {
    globalThis.fetch = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({
        code: '0',
        msg: '',
        data: [{ totalValue: '321.45' }],
      })
    );

    const client = new OkxClient({
      apiKey: 'key',
      secretKey: 'secret',
      passphrase: 'pass',
    });

    await expect(client.getDeFiPositions('0xabc')).resolves.toEqual({
      totalValueUsd: 321.45,
      hasPositions: true,
    });
  });

  it('returns typed token prices', async () => {
    globalThis.fetch = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({
          code: '0',
          msg: '',
          data: [
            {
              chainIndex: '1',
              tokenContractAddress: '0xtoken-1',
              price: '1.23',
              time: '1700000000',
            },
          ],
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          code: '0',
          msg: '',
          data: [
            {
              chainIndex: '10',
              tokenContractAddress: '0xtoken-2',
              price: '4.56',
              time: '1700000100',
            },
          ],
        })
      );

    const client = new OkxClient({
      apiKey: 'key',
      secretKey: 'secret',
      passphrase: 'pass',
    });

    await expect(
      client.getTokenPrices([
        { chainIndex: '1', tokenContractAddress: '0xtoken-1' },
        { chainIndex: '10', tokenContractAddress: '0xtoken-2' },
      ])
    ).resolves.toEqual([
      {
        chainIndex: '1',
        tokenContractAddress: '0xtoken-1',
        price: 1.23,
        timestamp: 1700000000,
      },
      {
        chainIndex: '10',
        tokenContractAddress: '0xtoken-2',
        price: 4.56,
        timestamp: 1700000100,
      },
    ]);
  });

  it('surfaces API envelope errors', async () => {
    globalThis.fetch = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({
        code: '51000',
        msg: 'invalid request',
        data: [],
      })
    );

    const client = new OkxClient({
      apiKey: 'key',
      secretKey: 'secret',
      passphrase: 'pass',
    });

    await expect(client.getWalletHistory('0xabc')).rejects.toThrow(
      'OKX API error: invalid request'
    );
  });

  it('retries transient HTTP 5xx responses before succeeding', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response('upstream unavailable', {
          status: 503,
          statusText: 'Service Unavailable',
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          code: '0',
          msg: '',
          data: [{ totalValue: '42.00' }],
        })
      );
    globalThis.fetch = fetchMock;

    const client = new OkxClient({
      apiKey: 'key',
      passphrase: 'pass',
      retryDelaysMs: [0, 0],
      secretKey: 'secret',
    });

    await expect(client.getDeFiPositions('0xabc')).resolves.toEqual({
      hasPositions: true,
      totalValueUsd: 42,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('retries timeout failures up to the retry budget', async () => {
    const fetchMock = vi.fn<typeof fetch>((_url, init) => {
      const signal = init?.signal;

      return new Promise<Response>((_resolve, reject) => {
        signal?.addEventListener('abort', () => {
          const error = new Error('aborted');
          error.name = 'AbortError';
          reject(error);
        });
      });
    });
    globalThis.fetch = fetchMock;

    const client = new OkxClient({
      apiKey: 'key',
      passphrase: 'pass',
      retryDelaysMs: [0, 0],
      secretKey: 'secret',
      timeoutMs: 1,
    });

    await expect(client.getDeFiPositions('0xabc')).rejects.toThrow('OKX_API_TIMEOUT');
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('does not retry non-transient 4xx responses', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response('bad request', {
        status: 400,
        statusText: 'Bad Request',
      })
    );
    globalThis.fetch = fetchMock;

    const client = new OkxClient({
      apiKey: 'key',
      passphrase: 'pass',
      retryDelaysMs: [0, 0],
      secretKey: 'secret',
    });

    await expect(client.getDeFiPositions('0xabc')).rejects.toThrow(
      'OKX API error: 400 Bad Request'
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
