import { Wallet } from 'ethers';
import { afterEach, describe, expect, it } from 'vitest';
import { getCredentialSignerWallet } from './config';
import { serializeCredentialPayload, signCredential, verifyCredentialSignature } from './signing';

const TEST_PRIVATE_KEY = '0x59c6995e998f97a5a0044966f0945382db2fb0f5df7e2a5d41f09be6f6c2a88b';
const TEST_WALLET = new Wallet(TEST_PRIVATE_KEY);

describe('credential signing', () => {
  afterEach(() => {
    process.env.ECDSA_PRIVATE_KEY = undefined;
    process.env.ECDSA_PUBLIC_ADDRESS = undefined;
  });

  it('signs payloads with secp256k1 and verifies the signature', async () => {
    const payload = {
      issuedAt: 1709000000,
      score: 720,
      tier: 'good',
      wallet: '0x1234567890AbcdEF1234567890aBcdef12345678',
    } as const;

    const signature = await signCredential(payload, TEST_WALLET);

    await expect(verifyCredentialSignature(payload, signature, TEST_WALLET.address)).resolves.toBe(
      true
    );
  });

  it('serializes object keys deterministically before signing', async () => {
    const firstPayload = {
      dimensions: {
        assetScale: 70,
        walletAge: 90,
      },
      score: 810,
      wallet: '0x1234567890AbcdEF1234567890aBcdef12345678',
    } as const;
    const secondPayload = {
      score: 810,
      wallet: '0x1234567890AbcdEF1234567890aBcdef12345678',
      dimensions: {
        walletAge: 90,
        assetScale: 70,
      },
    } as const;

    expect(serializeCredentialPayload(firstPayload)).toBe(
      serializeCredentialPayload(secondPayload)
    );
    await expect(signCredential(firstPayload, TEST_WALLET)).resolves.toBe(
      await signCredential(secondPayload, TEST_WALLET)
    );
  });

  it('rejects mismatched configured signer addresses', () => {
    process.env.ECDSA_PRIVATE_KEY = TEST_PRIVATE_KEY;
    process.env.ECDSA_PUBLIC_ADDRESS = '0x0000000000000000000000000000000000000001';

    expect(() => getCredentialSignerWallet()).toThrow(
      'ECDSA_PUBLIC_ADDRESS does not match ECDSA_PRIVATE_KEY'
    );
  });
});
