import { isAddress } from 'ethers';
import { describe, expect, it } from 'vitest';
import { createCredentialSigner, upsertEnvEntries } from './credential-signer';

describe('createCredentialSigner', () => {
  it('generates a valid ECDSA signer pair', () => {
    const signer = createCredentialSigner();

    expect(signer.privateKey).toMatch(/^0x[0-9a-fA-F]{64}$/u);
    expect(isAddress(signer.publicAddress)).toBe(true);
    expect(signer.siweSessionSecret).toBeUndefined();
  });

  it('can also generate a SIWE session secret', () => {
    const signer = createCredentialSigner(true);

    expect(signer.siweSessionSecret).toMatch(/^[0-9a-f]{64}$/u);
  });
});

describe('upsertEnvEntries', () => {
  it('replaces existing entries and preserves unrelated values', () => {
    const nextContents = upsertEnvEntries(
      ['OKX_API_KEY=placeholder', 'ECDSA_PUBLIC_ADDRESS=placeholder', ''].join('\n'),
      {
        ECDSA_PRIVATE_KEY: '0xabc',
        ECDSA_PUBLIC_ADDRESS: '0xdef',
      }
    );

    expect(nextContents).toContain('OKX_API_KEY=placeholder');
    expect(nextContents).toContain('ECDSA_PRIVATE_KEY=0xabc');
    expect(nextContents).toContain('ECDSA_PUBLIC_ADDRESS=0xdef');
  });
});
