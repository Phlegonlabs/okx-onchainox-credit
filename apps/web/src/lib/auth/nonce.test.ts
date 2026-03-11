import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  SIWE_NONCE_COOKIE_NAME,
  createSiweNonceChallenge,
  verifySiweNonceChallenge,
} from './nonce';

describe('siwe nonce helpers', () => {
  beforeEach(() => {
    vi.stubEnv('SIWE_SESSION_SECRET', 'test-secret');
  });

  it('creates a signed challenge that verifies against the issued nonce', () => {
    const challenge = createSiweNonceChallenge(new Date('2026-03-11T00:00:00.000Z'));
    const cookieHeader = `${SIWE_NONCE_COOKIE_NAME}=${challenge.token}; Path=/; HttpOnly`;

    expect(
      verifySiweNonceChallenge(cookieHeader, challenge.nonce, new Date('2026-03-11T00:01:00.000Z'))
    ).toBe(true);
  });

  it('rejects mismatched nonces', () => {
    const challenge = createSiweNonceChallenge(new Date('2026-03-11T00:00:00.000Z'));
    const cookieHeader = `${SIWE_NONCE_COOKIE_NAME}=${challenge.token}; Path=/; HttpOnly`;

    expect(verifySiweNonceChallenge(cookieHeader, 'differentnonce')).toBe(false);
  });

  it('rejects expired challenges', () => {
    const issuedAt = new Date('2026-03-11T00:00:00.000Z');
    const challenge = createSiweNonceChallenge(issuedAt);
    const cookieHeader = `${SIWE_NONCE_COOKIE_NAME}=${challenge.token}; Path=/; HttpOnly`;

    expect(
      verifySiweNonceChallenge(cookieHeader, challenge.nonce, new Date('2026-03-11T00:06:00.000Z'))
    ).toBe(false);
  });
});
