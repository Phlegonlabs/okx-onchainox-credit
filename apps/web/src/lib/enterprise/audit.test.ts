import { describe, expect, it, vi } from 'vitest';
import { logEnterpriseApiQuery } from './audit';

describe('logEnterpriseApiQuery', () => {
  it('writes an enterprise api query record to audit_log', async () => {
    const values = vi.fn().mockResolvedValue(undefined);
    const insert = vi.fn().mockReturnValue({ values });
    const database = {
      insert,
    } as unknown as Parameters<typeof logEnterpriseApiQuery>[1];

    await logEnterpriseApiQuery(
      {
        metadata: {
          resourceVersion: 'v1',
          valid: true,
        },
        payer: '0xpayer',
        resource: 'credential_verification',
        scoreTier: 'good',
        walletHash: 'wallet-hash',
        x402Tx: '0xtx',
      },
      database
    );

    expect(insert).toHaveBeenCalled();
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'api_query',
        metadata: {
          resource: 'credential_verification',
          resourceVersion: 'v1',
          valid: true,
        },
        payer: '0xpayer',
        scoreTier: 'good',
        walletHash: 'wallet-hash',
        x402Tx: '0xtx',
      })
    );
  });
});
