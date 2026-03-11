import { describe, expect, it, vi } from 'vitest';
import { runReleaseSmoke } from './smoke-lib';

describe('runReleaseSmoke', () => {
  it('passes when the deployed app returns the expected public responses', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('<html></html>', { status: 200 }))
      .mockResolvedValueOnce(
        Response.json({
          status: 'ok',
          uptime: 42,
          version: '0.1.0',
        })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            expiresAt: '2026-03-11T12:00:00.000Z',
            nonce: 'abc123',
          }),
          {
            headers: {
              'content-type': 'application/json',
              'set-cookie': 'okx_credit_siwe_nonce=token; Path=/; HttpOnly',
            },
            status: 200,
          }
        )
      )
      .mockResolvedValueOnce(
        Response.json(
          {
            paymentRequired: {
              header: 'Payment-Signature',
              resource: 'credential_issuance',
            },
          },
          { status: 402 }
        )
      )
      .mockResolvedValueOnce(
        Response.json(
          {
            paymentRequired: {
              header: 'Payment-Signature',
              resource: 'score_query',
            },
          },
          { status: 402 }
        )
      )
      .mockResolvedValueOnce(
        Response.json(
          {
            paymentRequired: {
              header: 'Payment-Signature',
              resource: 'credential_verification',
            },
          },
          { status: 402 }
        )
      );

    const results = await runReleaseSmoke({
      baseUrl: 'https://credit.okx.test/path-that-will-be-normalized',
      fetchImpl,
    });

    expect(results.every((result) => result.ok)).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(6);
    expect(fetchImpl).toHaveBeenNthCalledWith(
      1,
      'https://credit.okx.test',
      expect.objectContaining({
        headers: {
          accept: 'text/html',
        },
      })
    );
  });

  it('reports failed checks instead of throwing', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('<html></html>', { status: 200 }))
      .mockResolvedValueOnce(
        Response.json({
          status: 'ok',
          uptime: '42',
          version: '',
        })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            expiresAt: '2026-03-11T12:00:00.000Z',
            nonce: 'abc123',
          }),
          {
            headers: {
              'content-type': 'application/json',
              'set-cookie': 'okx_credit_siwe_nonce=token; Path=/; HttpOnly',
            },
            status: 200,
          }
        )
      )
      .mockResolvedValue(new Response(null, { status: 402 }));

    const results = await runReleaseSmoke({
      baseUrl: 'https://credit.okx.test',
      fetchImpl,
    });

    expect(results.find((result) => result.name === 'health')).toMatchObject({
      ok: false,
    });
    expect(results.find((result) => result.name === 'credential-payment-challenge')).toMatchObject({
      ok: false,
    });
  });
});
