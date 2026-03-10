import { describe, expect, it } from 'vitest';
import { parseCredentialQueryValue } from './verification';

function createCredentialJson() {
  return JSON.stringify({
    dimensions: {
      assetScale: 72,
      multichain: 68,
      positionStability: 74,
      repaymentHistory: 81,
      walletAge: 77,
    },
    expiresAt: 1775692800,
    issuedAt: 1773100800,
    issuer: 'okx-onchainos-credit',
    score: 720,
    signature: '0xsigned',
    tier: 'good',
    version: '1.0',
    wallet: '0x1234567890AbcdEF1234567890aBcdef12345678',
  });
}

describe('parseCredentialQueryValue', () => {
  it('parses a valid issued credential from the query string', () => {
    expect(parseCredentialQueryValue(createCredentialJson())).toMatchObject({
      score: 720,
      signature: '0xsigned',
      wallet: '0x1234567890AbcdEF1234567890aBcdef12345678',
    });
  });

  it('rejects malformed JSON payloads', () => {
    expect(() => parseCredentialQueryValue('{invalid')).toThrow(
      'Credential query parameter must be valid JSON.'
    );
  });

  it('rejects missing signatures and malformed payloads', () => {
    expect(() =>
      parseCredentialQueryValue(
        JSON.stringify({
          expiresAt: 1775692800,
          issuedAt: 1773100800,
          issuer: 'okx-onchainos-credit',
          score: 720,
          version: '1.0',
          wallet: '0x1234567890AbcdEF1234567890aBcdef12345678',
        })
      )
    ).toThrow('Credential signature is required.');
  });
});
