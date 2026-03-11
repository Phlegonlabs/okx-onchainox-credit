import { schema } from '@/lib/db';
import { describe, expect, it, vi } from 'vitest';
import { consumeSiweNonce, createDrizzleSiweNonceStore } from './nonce-store';

function createTransactionHarness() {
  const deleteWhere = vi.fn().mockResolvedValue(undefined);
  const deleteTable = vi.fn().mockReturnValue({
    where: deleteWhere,
  });
  const insertValues = vi.fn().mockResolvedValue(undefined);
  const insertTable = vi.fn().mockReturnValue({
    values: insertValues,
  });
  const tx = {
    delete: deleteTable,
    insert: insertTable,
  };
  const database = {
    transaction: vi.fn(async (callback: (value: typeof tx) => Promise<boolean>) => callback(tx)),
  };

  return {
    database,
    deleteTable,
    deleteWhere,
    insertTable,
    insertValues,
  };
}

describe('createDrizzleSiweNonceStore', () => {
  it('records a nonce hash on first use', async () => {
    const harness = createTransactionHarness();
    const store = createDrizzleSiweNonceStore(harness.database as never);

    await expect(
      store.consume({
        nonceHash: 'abc123',
        now: new Date('2026-03-11T12:00:00.000Z'),
        retentionSeconds: 60,
      })
    ).resolves.toBe(true);

    expect(harness.deleteTable).toHaveBeenCalledWith(schema.siweNonceUses);
    expect(harness.insertTable).toHaveBeenCalledWith(schema.siweNonceUses);
    expect(harness.insertValues).toHaveBeenCalledWith({
      createdAt: '2026-03-11T12:00:00.000Z',
      nonceHash: 'abc123',
    });
  });

  it('treats duplicate nonce hashes as replay attempts', async () => {
    const harness = createTransactionHarness();
    harness.insertValues.mockRejectedValueOnce(
      new Error('UNIQUE constraint failed: siwe_nonce_uses.nonce_hash')
    );
    const store = createDrizzleSiweNonceStore(harness.database as never);

    await expect(
      store.consume({
        nonceHash: 'abc123',
        now: new Date('2026-03-11T12:00:00.000Z'),
        retentionSeconds: 60,
      })
    ).resolves.toBe(false);
  });

  it('rethrows unexpected database failures', async () => {
    const harness = createTransactionHarness();
    harness.insertValues.mockRejectedValueOnce(new Error('db unavailable'));
    const store = createDrizzleSiweNonceStore(harness.database as never);

    await expect(
      store.consume({
        nonceHash: 'abc123',
        now: new Date('2026-03-11T12:00:00.000Z'),
        retentionSeconds: 60,
      })
    ).rejects.toThrow('db unavailable');
  });
});

describe('consumeSiweNonce', () => {
  it('hashes the nonce before delegating to the store', async () => {
    const store = {
      consume: vi.fn().mockResolvedValue(true),
    };

    await expect(
      consumeSiweNonce('example-nonce', {
        now: new Date('2026-03-11T12:00:00.000Z'),
        retentionSeconds: 300,
        store,
      })
    ).resolves.toBe(true);

    expect(store.consume).toHaveBeenCalledWith({
      nonceHash: '37c5ab2a983c5cd6fd5a1fd0b969476fb28fefcce02f54000904cf32ee60b9e7',
      now: new Date('2026-03-11T12:00:00.000Z'),
      retentionSeconds: 300,
    });
  });
});
