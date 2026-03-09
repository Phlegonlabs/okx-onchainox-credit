import { beforeEach, describe, expect, it } from 'vitest';
import { createSessionToken, getSessionFromCookieHeader, verifySessionToken } from './session';

describe('session helpers', () => {
  beforeEach(() => {
    process.env.SIWE_SESSION_SECRET = 'test-secret';
    process.env.SIWE_SESSION_EXPIRY_DAYS = '7';
  });

  it('creates and verifies a session token', () => {
    const { token } = createSessionToken('0x1234567890abcdef1234567890abcdef12345678');

    expect(verifySessionToken(token)).toMatchObject({
      wallet: '0x1234567890abcdef1234567890abcdef12345678',
    });
  });

  it('rejects a tampered session token', () => {
    const { token } = createSessionToken('0x1234567890abcdef1234567890abcdef12345678');
    const tamperedToken = `${token}tampered`;

    expect(verifySessionToken(tamperedToken)).toBeNull();
  });

  it('reads a valid session from the cookie header', () => {
    const { token } = createSessionToken('0x1234567890abcdef1234567890abcdef12345678');
    const cookieHeader = `okx_credit_session=${token}; Path=/; HttpOnly`;

    expect(getSessionFromCookieHeader(cookieHeader)).toMatchObject({
      wallet: '0x1234567890abcdef1234567890abcdef12345678',
    });
  });
});
