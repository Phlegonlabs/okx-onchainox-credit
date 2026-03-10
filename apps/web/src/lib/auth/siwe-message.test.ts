import { describe, expect, it } from 'vitest';
import { createSiweMessage } from './siwe-message';

describe('createSiweMessage', () => {
  it('includes the supplied wallet, domain, uri, and nonce in the SIWE payload', () => {
    const message = createSiweMessage({
      address: '0x1234567890AbcdEF1234567890aBcdef12345678',
      chainId: 8453,
      domain: 'credit.okx.test',
      nonce: 'nonce123abc',
      uri: 'https://credit.okx.test',
    });

    expect(message).toContain('credit.okx.test wants you to sign in with your Ethereum account:');
    expect(message).toContain('0x1234567890AbcdEF1234567890aBcdef12345678');
    expect(message).toContain('URI: https://credit.okx.test');
    expect(message).toContain('Chain ID: 8453');
    expect(message).toContain('Nonce: nonce123abc');
  });

  it('uses the app sign-in statement for consistent wallet messaging', () => {
    const message = createSiweMessage({
      address: '0x1234567890AbcdEF1234567890aBcdef12345678',
      chainId: 1,
      domain: 'localhost:3000',
      nonce: 'nonce456def',
      uri: 'http://localhost:3000',
    });

    expect(message).toContain('Sign in to OKX OnchainOS Credit.');
  });
});
