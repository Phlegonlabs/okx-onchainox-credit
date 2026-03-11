import { describe, expect, it, vi } from 'vitest';
import { getAppUrl, getSessionExpiryDays, getSessionSecret } from './env';

describe('env helpers', () => {
  it('falls back to localhost outside production when NEXT_PUBLIC_APP_URL is unset', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', '');

    expect(getAppUrl()).toBe('http://localhost:3000');
  });

  it('returns the validated app origin when NEXT_PUBLIC_APP_URL is configured', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://credit.okx.test');

    expect(getAppUrl()).toBe('https://credit.okx.test');
  });

  it('rejects a missing production app url', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', '');

    expect(() => getAppUrl()).toThrow('NEXT_PUBLIC_APP_URL must be configured in production');
  });

  it('rejects production app urls that are not https origins', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'http://credit.okx.test/path');

    expect(() => getAppUrl()).toThrow(
      'NEXT_PUBLIC_APP_URL must be an origin without path, query, or hash'
    );

    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'http://credit.okx.test');

    expect(() => getAppUrl()).toThrow('NEXT_PUBLIC_APP_URL must use https in production');
  });

  it('requires a non-placeholder session secret', () => {
    vi.stubEnv('SIWE_SESSION_SECRET', 'placeholder');

    expect(() => getSessionSecret()).toThrow('SIWE_SESSION_SECRET must be configured');
  });

  it('uses the configured session expiry when valid and falls back otherwise', () => {
    vi.stubEnv('SIWE_SESSION_EXPIRY_DAYS', '14');
    expect(getSessionExpiryDays()).toBe(14);

    vi.stubEnv('SIWE_SESSION_EXPIRY_DAYS', '0');
    expect(getSessionExpiryDays()).toBe(7);
  });
});
