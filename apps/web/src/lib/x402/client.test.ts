import { afterEach, describe, expect, it, vi } from 'vitest';
import { OkxX402Client } from './client';
import type { X402PaymentPayload, X402PaymentRequirements } from './payload';

const ORIGINAL_FETCH = globalThis.fetch;

const paymentPayload: X402PaymentPayload = {
  chainIndex: '196',
  payload: {
    authorization: {
      from: '0x1234567890abcdef1234567890abcdef12345678',
      nonce: `0x${'1'.repeat(64)}`,
      to: '0x6d5056da1e584e11faa280dbaf3b72676333dd05',
      validAfter: '1741708800',
      validBefore: '1741709400',
      value: '100000',
    },
    signature: '0xsignedpayload',
  },
  scheme: 'exact',
  x402Version: 1,
};

const paymentRequirements: X402PaymentRequirements = {
  asset: '0x779ded0c9e1022225f8e0630b35a9b54be713736',
  chainIndex: '196',
  extra: {
    decimals: 6,
    domainName: 'USD₮0',
    domainVersion: '1',
    gasLimit: '1000000',
    token: 'USDT0',
  },
  maxAmountRequired: '100000',
  maxTimeoutSeconds: 600,
  mimeType: 'application/json',
  payTo: '0x6d5056da1e584e11faa280dbaf3b72676333dd05',
  resource: 'https://example.com/api/v1/score?wallet=0x123',
  scheme: 'exact',
  x402Version: 1,
};

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
  vi.restoreAllMocks();
});

describe('OkxX402Client', () => {
  it('posts verify requests to the x402 endpoint with top-level chainIndex', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          code: '0',
          data: [
            {
              isValid: true,
              payerAddress: '0xpayer',
              txHash: '0xtxhash',
            },
          ],
          msg: '',
        }),
        {
          headers: {
            'content-type': 'application/json',
          },
          status: 200,
        }
      )
    );
    globalThis.fetch = fetchMock as typeof fetch;

    const client = new OkxX402Client({
      apiKey: 'key',
      passphrase: 'pass',
      secretKey: 'secret',
    });

    const verification = await client.verifyPayment(paymentPayload, paymentRequirements);

    expect(verification).toMatchObject({
      isValid: true,
      payer: '0xpayer',
      txHash: '0xtxhash',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://web3.okx.com/api/v6/x402/verify',
      expect.objectContaining({
        body: JSON.stringify({
          chainIndex: '196',
          paymentPayload,
          paymentRequirements,
          x402Version: 1,
        }),
        method: 'POST',
      })
    );
  });

  it('posts settle requests to the x402 endpoint and reads errorReason from the response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          code: '0',
          data: [
            {
              errorReason: 'signature_expired',
              isSettled: false,
              payerAddress: '0xpayer',
              settlementId: 'settlement-1',
              txHash: '0xtxhash',
            },
          ],
          msg: '',
        }),
        {
          headers: {
            'content-type': 'application/json',
          },
          status: 200,
        }
      )
    );
    globalThis.fetch = fetchMock as typeof fetch;

    const client = new OkxX402Client({
      apiKey: 'key',
      passphrase: 'pass',
      secretKey: 'secret',
    });

    const settlement = await client.settlePayment(paymentPayload, paymentRequirements);

    expect(settlement).toMatchObject({
      invalidReason: 'signature_expired',
      payer: '0xpayer',
      settlementId: 'settlement-1',
      success: false,
      txHash: '0xtxhash',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://web3.okx.com/api/v6/x402/settle',
      expect.objectContaining({
        body: JSON.stringify({
          chainIndex: '196',
          paymentPayload,
          paymentRequirements,
          x402Version: 1,
        }),
        method: 'POST',
      })
    );
  });

  it('retries transient x402 HTTP 5xx responses before succeeding', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response('temporarily unavailable', {
          status: 502,
          statusText: 'Bad Gateway',
        })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            code: '0',
            data: [{ isValid: true, payerAddress: '0xpayer' }],
            msg: '',
          }),
          {
            headers: {
              'content-type': 'application/json',
            },
            status: 200,
          }
        )
      );
    globalThis.fetch = fetchMock;

    const client = new OkxX402Client({
      apiKey: 'key',
      passphrase: 'pass',
      retryDelaysMs: [0, 0],
      secretKey: 'secret',
    });

    await expect(client.verifyPayment(paymentPayload, paymentRequirements)).resolves.toMatchObject({
      isValid: true,
      payer: '0xpayer',
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

    const client = new OkxX402Client({
      apiKey: 'key',
      passphrase: 'pass',
      retryDelaysMs: [0, 0],
      secretKey: 'secret',
      timeoutMs: 1,
    });

    await expect(client.verifyPayment(paymentPayload, paymentRequirements)).rejects.toThrow(
      'OKX_API_TIMEOUT'
    );
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('does not retry non-transient x402 failures', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          code: '51000',
          data: [],
          msg: 'invalid signature',
        }),
        {
          headers: {
            'content-type': 'application/json',
          },
          status: 200,
        }
      )
    );
    globalThis.fetch = fetchMock;

    const client = new OkxX402Client({
      apiKey: 'key',
      passphrase: 'pass',
      retryDelaysMs: [0, 0],
      secretKey: 'secret',
    });

    await expect(client.verifyPayment(paymentPayload, paymentRequirements)).rejects.toThrow(
      'OKX x402 API error: invalid signature'
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
