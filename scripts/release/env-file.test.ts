import { describe, expect, it } from 'vitest';
import { parseEnvFile } from './env-file';

describe('parseEnvFile', () => {
  it('parses plain values, quoted values, and export-prefixed entries', () => {
    const env = parseEnvFile(`
# comment
OKX_API_KEY=api-key
export NEXT_PUBLIC_APP_URL=https://credit.okx.test
SIWE_SESSION_SECRET="test-secret"
LOCAL_INTEGRATION_MODE=mock # inline comment
`);

    expect(env).toEqual({
      LOCAL_INTEGRATION_MODE: 'mock',
      NEXT_PUBLIC_APP_URL: 'https://credit.okx.test',
      OKX_API_KEY: 'api-key',
      SIWE_SESSION_SECRET: 'test-secret',
    });
  });

  it('ignores blank lines and malformed entries', () => {
    const env = parseEnvFile(`

MALFORMED
=missing-key
TURSO_AUTH_TOKEN=turso-token
`);

    expect(env).toEqual({
      TURSO_AUTH_TOKEN: 'turso-token',
    });
  });
});
