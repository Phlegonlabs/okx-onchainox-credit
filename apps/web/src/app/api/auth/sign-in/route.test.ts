import { SiweMessage } from 'siwe';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET as getNonce } from '../nonce/route';
import { GET as getSession } from '../session/route';
import { POST as postSignIn } from './route';

const TEST_WALLET = '0x1234567890AbcdEF1234567890aBcdef12345678';

function createRequest(body: unknown, cookie?: string): Request {
  return new Request('http://localhost:3000/api/auth/sign-in', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      host: 'localhost:3000',
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
  });
}

async function issueNonce(): Promise<{ cookie: string; nonce: string }> {
  const response = await getNonce();
  const payload = (await response.json()) as { nonce: string };
  const cookie = response.headers.get('set-cookie');

  if (!cookie) {
    throw new Error('expected nonce cookie to be set');
  }

  return {
    cookie,
    nonce: payload.nonce,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('auth routes', () => {
  it('signs in and sets an httpOnly session cookie', async () => {
    process.env.SIWE_SESSION_SECRET = 'test-secret';
    const challenge = await issueNonce();

    const message = new SiweMessage({
      domain: 'localhost:3000',
      address: TEST_WALLET,
      statement: 'Sign in to OKX credit',
      uri: 'http://localhost:3000',
      version: '1',
      chainId: 1,
      nonce: challenge.nonce,
    }).prepareMessage();

    vi.spyOn(SiweMessage.prototype, 'verify').mockResolvedValue({
      success: true,
      data: new SiweMessage(message),
    });

    const response = await postSignIn(
      createRequest(
        {
          message,
          signature: '0xsigned',
        },
        challenge.cookie
      )
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('set-cookie')).toContain('okx_credit_session=');
    await expect(response.json()).resolves.toMatchObject({
      wallet: TEST_WALLET,
    });
  });

  it('returns the wallet from a valid session cookie', async () => {
    process.env.SIWE_SESSION_SECRET = 'test-secret';
    const challenge = await issueNonce();
    vi.spyOn(SiweMessage.prototype, 'verify').mockResolvedValue({
      success: true,
      data: new SiweMessage({
        domain: 'localhost:3000',
        address: TEST_WALLET,
        statement: 'Sign in to OKX credit',
        uri: 'http://localhost:3000',
        version: '1',
        chainId: 1,
        nonce: challenge.nonce,
      }),
    });

    const signInResponse = await postSignIn(
      createRequest(
        {
          message: new SiweMessage({
            domain: 'localhost:3000',
            address: TEST_WALLET,
            statement: 'Sign in to OKX credit',
            uri: 'http://localhost:3000',
            version: '1',
            chainId: 1,
            nonce: challenge.nonce,
          }).prepareMessage(),
          signature: '0xsigned',
        },
        challenge.cookie
      )
    );

    const setCookieHeader = signInResponse.headers.get('set-cookie');
    if (!setCookieHeader) {
      throw new Error('expected session cookie to be set');
    }

    const sessionResponse = await getSession(
      new Request('http://localhost:3000/api/auth/session', {
        headers: {
          cookie: setCookieHeader,
        },
      })
    );

    await expect(sessionResponse.json()).resolves.toEqual({
      wallet: TEST_WALLET,
      expiresAt: expect.any(String),
    });
  });

  it('rejects invalid SIWE payloads', async () => {
    process.env.SIWE_SESSION_SECRET = 'test-secret';
    const challenge = await issueNonce();

    vi.spyOn(SiweMessage.prototype, 'verify').mockResolvedValue({
      success: false,
      data: new SiweMessage({
        domain: 'localhost:3000',
        address: TEST_WALLET,
        statement: 'Sign in to OKX credit',
        uri: 'http://localhost:3000',
        version: '1',
        chainId: 1,
        nonce: challenge.nonce,
      }),
    });

    const response = await postSignIn(
      createRequest(
        {
          message: new SiweMessage({
            domain: 'localhost:3000',
            address: TEST_WALLET,
            statement: 'Sign in to OKX credit',
            uri: 'http://localhost:3000',
            version: '1',
            chainId: 1,
            nonce: challenge.nonce,
          }).prepareMessage(),
          signature: '0xbad',
        },
        challenge.cookie
      )
    );

    expect(response.status).toBe(401);
  });

  it('rejects replaying the same SIWE message after the nonce cookie is consumed', async () => {
    process.env.SIWE_SESSION_SECRET = 'test-secret';
    const challenge = await issueNonce();

    const message = new SiweMessage({
      domain: 'localhost:3000',
      address: TEST_WALLET,
      statement: 'Sign in to OKX credit',
      uri: 'http://localhost:3000',
      version: '1',
      chainId: 1,
      nonce: challenge.nonce,
    }).prepareMessage();

    vi.spyOn(SiweMessage.prototype, 'verify').mockResolvedValue({
      success: true,
      data: new SiweMessage(message),
    });

    const firstResponse = await postSignIn(
      createRequest(
        {
          message,
          signature: '0xsigned',
        },
        challenge.cookie
      )
    );
    expect(firstResponse.status).toBe(200);

    const replayResponse = await postSignIn(
      createRequest({
        message,
        signature: '0xsigned',
      })
    );

    expect(replayResponse.status).toBe(401);
    await expect(replayResponse.json()).resolves.toMatchObject({
      error: {
        code: 'SIWE_VERIFICATION_FAILED',
      },
    });
  });
});
