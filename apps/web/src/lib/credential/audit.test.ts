import { describe, expect, it, vi } from 'vitest';
import { logCredentialIssuance } from './audit';

describe('logCredentialIssuance', () => {
  it('writes a credential issuance record to audit_log', async () => {
    const values = vi.fn().mockResolvedValue(undefined);
    const insert = vi.fn().mockReturnValue({ values });
    const database = {
      insert,
    } as unknown as Parameters<typeof logCredentialIssuance>[1];

    await logCredentialIssuance(
      {
        expiresAt: 1711600000,
        issuedAt: 1709000000,
        payer: '0xpayer',
        scoreTier: 'good',
        walletHash: 'wallet-hash',
        x402Tx: '0xtx',
      },
      database
    );

    expect(insert).toHaveBeenCalled();
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'credential_issued',
        metadata: {
          expiresAt: 1711600000,
          issuedAt: 1709000000,
          version: '1.0',
        },
        payer: '0xpayer',
        scoreTier: 'good',
        walletHash: 'wallet-hash',
        x402Tx: '0xtx',
      })
    );
  });
});
