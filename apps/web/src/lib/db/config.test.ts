import { afterEach, describe, expect, it, vi } from 'vitest';
import { getDatabaseConfig } from './config';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('getDatabaseConfig', () => {
  it('falls back to the local database in non-production environments', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('TURSO_DATABASE_URL', '');
    vi.stubEnv('TURSO_AUTH_TOKEN', '');

    expect(getDatabaseConfig()).toEqual({
      url: 'file:local.db',
    });
  });

  it('fails closed in production when the Turso URL is missing', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('TURSO_DATABASE_URL', '');
    vi.stubEnv('TURSO_AUTH_TOKEN', '');

    expect(() => getDatabaseConfig()).toThrow(
      'TURSO_DATABASE_URL must be configured in production'
    );
  });

  it('requires an auth token for remote libSQL databases', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('TURSO_DATABASE_URL', 'libsql://credit-db.turso.io');
    vi.stubEnv('TURSO_AUTH_TOKEN', '');

    expect(() => getDatabaseConfig()).toThrow(
      'TURSO_AUTH_TOKEN must be configured for remote libSQL databases'
    );
  });
});
