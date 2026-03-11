import { describe, expect, it } from 'vitest';
import { getReleaseEnvReport } from './env-report';

const VALID_RELEASE_ENV = {
  ECDSA_PRIVATE_KEY: '0x59c6995e998f97a5a0044966f0945382db2fb0f5df7e2a5d41f09be6f6c2a88b',
  ECDSA_PUBLIC_ADDRESS: '0x8fc5a210aCCcD776Aa9b1E4f7B2335954BF6dE11',
  NEXT_PUBLIC_APP_URL: 'https://credit.okx.test',
  NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: 'wallet-connect-project-id',
  NODE_ENV: 'production',
  OKX_API_KEY: 'okx-key',
  OKX_BASE_URL: 'https://web3.okx.com',
  OKX_PASSPHRASE: 'okx-passphrase',
  OKX_SECRET_KEY: 'okx-secret',
  SIWE_SESSION_EXPIRY_DAYS: '7',
  SIWE_SESSION_SECRET: 'session-secret',
  TURSO_AUTH_TOKEN: 'turso-token',
  TURSO_DATABASE_URL: 'libsql://okx-credit-prod.turso.io',
  X402_CHAIN_ID: '196',
  X402_CREDENTIAL_PRICE_USD: '0.50',
  X402_NETWORK: 'xlayer',
  X402_PAYMENT_TOKEN: 'USDT0',
  X402_RECIPIENT_ADDRESS: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
  X402_SCORE_QUERY_PRICE_USD: '0.10',
  X402_USDT0_ADDRESS: '0x779ded0c9e1022225f8e0630b35a9b54be713736',
} satisfies NodeJS.ProcessEnv;

describe('getReleaseEnvReport', () => {
  it('accepts a valid release environment', () => {
    const report = getReleaseEnvReport(VALID_RELEASE_ENV, 'production');

    expect(report.errors).toEqual([]);
    expect(report.warnings).toEqual([]);
    expect(report.summary).toMatchObject({
      appUrl: 'https://credit.okx.test',
      databaseUrl: 'libsql://okx-credit-prod.turso.io',
      paymentToken: 'USDT0',
      target: 'production',
    });
  });

  it('rejects release targets that still point at local mock infrastructure', () => {
    const report = getReleaseEnvReport(
      {
        ...VALID_RELEASE_ENV,
        LOCAL_INTEGRATION_MODE: 'mock',
        NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
        TURSO_DATABASE_URL: 'file:local.db',
      },
      'preview'
    );

    expect(report.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          envName: 'LOCAL_INTEGRATION_MODE',
        }),
        expect.objectContaining({
          envName: 'NEXT_PUBLIC_APP_URL',
          message: expect.stringContaining('must use https'),
        }),
        expect.objectContaining({
          envName: 'TURSO_DATABASE_URL',
          message: expect.stringContaining('remote Turso database'),
        }),
      ])
    );
  });

  it('reports invalid signing and payment configuration', () => {
    const report = getReleaseEnvReport(
      {
        ...VALID_RELEASE_ENV,
        ECDSA_PRIVATE_KEY: 'not-a-private-key',
        ECDSA_PUBLIC_ADDRESS: '0x1234',
        X402_PAYMENT_TOKEN: 'BTC',
      },
      'production'
    );

    expect(report.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          envName: 'ECDSA_PRIVATE_KEY',
          message: expect.stringContaining('valid secp256k1 private key'),
        }),
        expect.objectContaining({
          envName: 'ECDSA_PUBLIC_ADDRESS',
          message: expect.stringContaining('valid EVM address'),
        }),
        expect.objectContaining({
          envName: 'X402_PAYMENT_TOKEN',
          message: expect.stringContaining('one of USDG, USDT, USDT0, or USDC'),
        }),
      ])
    );
  });
});
