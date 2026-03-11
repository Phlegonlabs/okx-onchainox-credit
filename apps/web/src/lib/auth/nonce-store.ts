import { createHash } from 'node:crypto';
import { db, schema } from '@/lib/db';
import { lt } from 'drizzle-orm';

const DEFAULT_NONCE_RETENTION_SECONDS = 24 * 60 * 60;

interface ConsumeSiweNonceInput {
  nonceHash: string;
  now: Date;
  retentionSeconds: number;
}

export interface SiweNonceStore {
  consume(input: ConsumeSiweNonceInput): Promise<boolean>;
}

function hashSiweNonce(nonce: string): string {
  return createHash('sha256').update(nonce).digest('hex');
}

function isUniqueConstraintError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.message.includes('UNIQUE constraint failed') ||
    error.message.includes('SQLITE_CONSTRAINT_UNIQUE') ||
    error.message.includes('siwe_nonce_uses_nonce_hash_idx')
  );
}

export function createDrizzleSiweNonceStore(database: typeof db = db): SiweNonceStore {
  return {
    async consume(input) {
      const nowIso = input.now.toISOString();
      const retentionCutoffIso = new Date(
        input.now.getTime() - input.retentionSeconds * 1_000
      ).toISOString();

      return database.transaction(async (tx) => {
        await tx
          .delete(schema.siweNonceUses)
          .where(lt(schema.siweNonceUses.createdAt, retentionCutoffIso));

        try {
          await tx.insert(schema.siweNonceUses).values({
            nonceHash: input.nonceHash,
            createdAt: nowIso,
          });

          return true;
        } catch (error) {
          if (isUniqueConstraintError(error)) {
            return false;
          }

          throw error;
        }
      });
    },
  };
}

export async function consumeSiweNonce(
  nonce: string,
  options: {
    now?: Date;
    retentionSeconds?: number;
    store?: SiweNonceStore;
  } = {}
): Promise<boolean> {
  const now = options.now ?? new Date();
  const retentionSeconds = options.retentionSeconds ?? DEFAULT_NONCE_RETENTION_SECONDS;
  const store = options.store ?? createDrizzleSiweNonceStore();

  return store.consume({
    nonceHash: hashSiweNonce(nonce),
    now,
    retentionSeconds,
  });
}
