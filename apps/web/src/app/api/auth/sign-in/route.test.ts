import { SiweMessage } from 'siwe';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET as getSession } from '../session/route';
import { POST as postSignIn } from './route';

const TEST_WALLET = '0x1234567890AbcdEF1234567890aBcdef12345678';

afterEach(() => {
  vi.restoreAllMocks();
});

function createRequest(body: unknown): Request {
  return new Request('http://localhost:3000/api/auth/sign-in', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      host: 'localhost:3000',
    },
    body: JSON.stringify(body),
  });
}

describe('auth routes', () => {
  it('signs in and sets an httpOnly session cookie', async () => {
    process.env.SIWE_SESSION_SECRET = 'test-secret';

    const message = new SiweMessage({
      domain: 'localhost:3000',
      address: TEST_WALLET,
      statement: 'Sign in to OKX credit',
      uri: 'http://localhost:3000',
      version: '1',
      chainId: 1,
      nonce: 'abcdef12',
    }).prepareMessage();

    vi.spyOn(SiweMessage.prototype, 'verify').mockResolvedValue({
      success: true,
      data: new SiweMessage(message),
    });

    const response = await postSignIn(
      createRequest({
        message,
        signature: '0xsigned',
      })
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('set-cookie')).toContain('okx_credit_session=');
    await expect(response.json()).resolves.toMatchObject({
      wallet: TEST_WALLET,
    });
  });

  it('returns the wallet from a valid session cookie', async () => {
    process.env.SIWE_SESSION_SECRET = 'test-secret';
    vi.spyOn(SiweMessage.prototype, 'verify').mockResolvedValue({
      success: true,
      data: new SiweMessage({
        domain: 'localhost:3000',
        address: TEST_WALLET,
        statement: 'Sign in to OKX credit',
        uri: 'http://localhost:3000',
        version: '1',
        chainId: 1,
        nonce: 'abcdef12',
      }),
    });

    const signInResponse = await postSignIn(
      createRequest({
        message: new SiweMessage({
          domain: 'localhost:3000',
          address: TEST_WALLET,
          statement: 'Sign in to OKX credit',
          uri: 'http://localhost:3000',
          version: '1',
          chainId: 1,
          nonce: 'abcdef12',
        }).prepareMessage(),
        signature: '0xsigned',
      })
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
    vi.spyOn(SiweMessage.prototype, 'verify').mockResolvedValue({
      success: false,
      data: new SiweMessage({
        domain: 'localhost:3000',
        address: TEST_WALLET,
        statement: 'Sign in to OKX credit',
        uri: 'http://localhost:3000',
        version: '1',
        chainId: 1,
        nonce: 'abcdef12',
      }),
    });

    const response = await postSignIn(
      createRequest({
        message: new SiweMessage({
          domain: 'localhost:3000',
          address: TEST_WALLET,
          statement: 'Sign in to OKX credit',
          uri: 'http://localhost:3000',
          version: '1',
          chainId: 1,
          nonce: 'abcdef12',
        }).prepareMessage(),
        signature: '0xbad',
      })
    );

    expect(response.status).toBe(401);
  });
});
