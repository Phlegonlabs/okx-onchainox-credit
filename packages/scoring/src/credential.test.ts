import { Wallet } from 'ethers';
import { describe, expect, it } from 'vitest';
import {
  type CredentialPayload,
  isCredentialPayload,
  parseIssuedCredential,
  serializeCredentialPayload,
  verifyCredentialSignature,
} from './credential.js';

const CREDENTIAL_EXPIRY_SECONDS = 30 * 24 * 60 * 60;
const TEST_WALLET_ADDRESS = '0x1234567890AbcdEF1234567890aBcdef12345678';

function makeValidPayload(overrides: Partial<CredentialPayload> = {}): CredentialPayload {
  const issuedAt = 1_700_000_000;

  return {
    dimensions: {
      assetScale: 80,
      multichain: 60,
      positionStability: 70,
      repaymentHistory: 90,
      walletAge: 100,
    },
    expiresAt: issuedAt + CREDENTIAL_EXPIRY_SECONDS,
    issuedAt,
    issuer: 'okx-onchainos-credit',
    score: 720,
    tier: 'good',
    version: '1.0',
    wallet: TEST_WALLET_ADDRESS,
    ...overrides,
  };
}

describe('isCredentialPayload', () => {
  it('returns true for a valid payload', () => {
    expect(isCredentialPayload(makeValidPayload())).toBe(true);
  });

  it('returns false for null / non-object', () => {
    expect(isCredentialPayload(null)).toBe(false);
    expect(isCredentialPayload('string')).toBe(false);
    expect(isCredentialPayload(42)).toBe(false);
  });

  it('returns false when version is wrong', () => {
    expect(isCredentialPayload(makeValidPayload({ version: '2.0' as '1.0' }))).toBe(false);
  });

  it('returns false when issuer is wrong', () => {
    expect(
      isCredentialPayload(makeValidPayload({ issuer: 'other-issuer' as 'okx-onchainos-credit' }))
    ).toBe(false);
  });

  it('returns false for an invalid wallet address', () => {
    expect(isCredentialPayload(makeValidPayload({ wallet: 'not-an-address' }))).toBe(false);
  });

  it('returns false when score is not an integer', () => {
    expect(isCredentialPayload(makeValidPayload({ score: 72.5 }))).toBe(false);
  });

  it('returns false when expiry offset is wrong', () => {
    expect(isCredentialPayload(makeValidPayload({ expiresAt: 1_700_000_000 + 9999 }))).toBe(false);
  });

  it('returns false when tier is missing', () => {
    const { tier: _removed, ...rest } = makeValidPayload();
    expect(isCredentialPayload(rest)).toBe(false);
  });
});

describe('parseIssuedCredential', () => {
  it('parses a valid issued credential string', () => {
    const payload = makeValidPayload();
    const input = JSON.stringify({ ...payload, signature: '0xabc123' });

    const result = parseIssuedCredential(input);

    expect(result.wallet).toBe(TEST_WALLET_ADDRESS);
    expect(result.signature).toBe('0xabc123');
    expect(result.score).toBe(720);
  });

  it('throws on malformed JSON', () => {
    expect(() => parseIssuedCredential('not json{')).toThrow('valid JSON');
  });

  it('throws when root value is not an object', () => {
    expect(() => parseIssuedCredential('"just a string"')).toThrow('JSON object');
  });

  it('throws when signature is missing', () => {
    const payload = makeValidPayload();
    expect(() => parseIssuedCredential(JSON.stringify(payload))).toThrow('signature is required');
  });

  it('throws when signature is empty string', () => {
    const input = JSON.stringify({ ...makeValidPayload(), signature: '' });
    expect(() => parseIssuedCredential(input)).toThrow('signature is required');
  });

  it('throws when payload fields are invalid', () => {
    const input = JSON.stringify({ signature: '0xabc', version: '1.0', score: 'not-a-number' });
    expect(() => parseIssuedCredential(input)).toThrow('payload is invalid');
  });
});

describe('serializeCredentialPayload', () => {
  it('produces deterministic JSON with sorted keys', () => {
    const payload = makeValidPayload();
    const serialized = serializeCredentialPayload(payload);
    const parsed = JSON.parse(serialized) as Record<string, unknown>;
    const keys = Object.keys(parsed);

    expect(keys).toEqual([...keys].sort());
  });

  it('produces the same output regardless of property insertion order', () => {
    const a = serializeCredentialPayload({ z: 1, a: 2 });
    const b = serializeCredentialPayload({ a: 2, z: 1 });

    expect(a).toBe(b);
  });

  it('throws for unsupported value types', () => {
    expect(() => serializeCredentialPayload({ fn: () => {} })).toThrow('unsupported value types');
  });
});

describe('verifyCredentialSignature', () => {
  it('returns true for a valid signature', async () => {
    const signer = Wallet.createRandom();
    const payload = makeValidPayload();
    const serialized = serializeCredentialPayload(payload);
    const signature = await signer.signMessage(serialized);

    const result = await verifyCredentialSignature(payload, signature, signer.address);

    expect(result).toBe(true);
  });

  it('returns false for a signature from a different wallet', async () => {
    const signer = Wallet.createRandom();
    const other = Wallet.createRandom();
    const payload = makeValidPayload();
    const signature = await signer.signMessage(serializeCredentialPayload(payload));

    const result = await verifyCredentialSignature(payload, signature, other.address);

    expect(result).toBe(false);
  });

  it('returns false when the payload is tampered', async () => {
    const signer = Wallet.createRandom();
    const payload = makeValidPayload();
    const signature = await signer.signMessage(serializeCredentialPayload(payload));
    const tampered = { ...payload, score: 850 };

    const result = await verifyCredentialSignature(tampered, signature, signer.address);

    expect(result).toBe(false);
  });
});
