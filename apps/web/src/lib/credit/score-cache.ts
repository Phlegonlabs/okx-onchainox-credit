import { db, schema } from '@/lib/db';
import { logger } from '@/lib/logger';
import { createWalletHash } from '@/lib/wallet/hash';
import type { RawWalletData, Score } from '@okx-credit/scoring';
import { computeScore } from '@okx-credit/scoring';
import { eq } from 'drizzle-orm';

const SCORE_DATA_SOURCE = 'okx_onchainos_v1';

export interface CachedScoreRecord extends Score {
  stale: boolean;
  walletHash: string;
}

export interface ScoreCacheStore {
  findByWalletHash(walletHash: string): Promise<CachedScoreRecord | null>;
  upsert(record: CachedScoreRecord): Promise<void>;
}

interface ScoreCacheLogger {
  error(context: Record<string, unknown>, message: string): void;
  info(context: Record<string, unknown>, message: string): void;
}

interface ResolveScoreWithCacheOptions {
  logger?: ScoreCacheLogger;
  now?: Date;
  scoreComputer?: (data: RawWalletData) => Promise<Score>;
  store?: ScoreCacheStore;
  wallet: string;
  walletDataLoader: () => Promise<RawWalletData>;
}

export function isScoreExpired(record: Pick<Score, 'expiresAt'>, now: Date): boolean {
  return new Date(record.expiresAt).getTime() <= now.getTime();
}

export async function getCachedScoreSnapshot(options: {
  logger?: ScoreCacheLogger;
  now?: Date;
  store?: ScoreCacheStore;
  wallet: string;
}): Promise<{
  freshness: 'expired' | 'fresh' | 'missing';
  walletHash: string;
  record: CachedScoreRecord | null;
}> {
  const activeLogger = options.logger ?? logger;
  const now = options.now ?? new Date();
  const store = options.store ?? createDrizzleScoreCacheStore();
  const walletHash = createWalletHash(options.wallet);

  try {
    const record = await store.findByWalletHash(walletHash);

    if (!record) {
      return {
        freshness: 'missing',
        record: null,
        walletHash,
      };
    }

    return {
      freshness: isScoreExpired(record, now) ? 'expired' : 'fresh',
      record,
      walletHash,
    };
  } catch (error) {
    activeLogger.error(
      {
        error: error instanceof Error ? error.message : String(error),
        operation: 'score_cache_lookup',
        walletHash,
      },
      'score cache lookup failed'
    );

    return {
      freshness: 'missing',
      record: null,
      walletHash,
    };
  }
}

function withCacheMetadata(
  record: CachedScoreRecord,
  cacheHit: boolean
): CachedScoreRecord & {
  cacheHit: boolean;
} {
  return {
    ...record,
    cacheHit,
  };
}

async function computeAndPersistScore(
  walletHash: string,
  walletDataLoader: () => Promise<RawWalletData>,
  store: ScoreCacheStore,
  scoreComputer: (data: RawWalletData) => Promise<Score>,
  activeLogger: ScoreCacheLogger
): Promise<CachedScoreRecord> {
  const data = await walletDataLoader();
  const score = await scoreComputer(data);
  const cachedScore: CachedScoreRecord = {
    ...score,
    stale: false,
    walletHash,
  };

  try {
    await store.upsert(cachedScore);
  } catch (error) {
    activeLogger.error(
      {
        error: error instanceof Error ? error.message : String(error),
        operation: 'score_cache_write',
        walletHash,
      },
      'score cache write failed'
    );
  }

  return cachedScore;
}

export function createDrizzleScoreCacheStore(database: typeof db = db): ScoreCacheStore {
  return {
    async findByWalletHash(walletHash) {
      const record = await database.query.creditScores.findFirst({
        where: eq(schema.creditScores.walletHash, walletHash),
      });

      if (!record) {
        return null;
      }

      return {
        walletHash: record.walletHash,
        wallet: '',
        score: record.score,
        tier: record.scoreTier as Score['tier'],
        dimensions: record.dimensions as Score['dimensions'],
        computedAt: record.computedAt,
        expiresAt: record.expiresAt,
        stale: record.stale,
      };
    },
    async upsert(record) {
      const nowIso = new Date().toISOString();

      await database
        .insert(schema.creditScores)
        .values({
          walletHash: record.walletHash,
          score: record.score,
          scoreTier: record.tier,
          dimensions: record.dimensions,
          dataSource: SCORE_DATA_SOURCE,
          stale: record.stale,
          computedAt: record.computedAt,
          expiresAt: record.expiresAt,
          createdAt: nowIso,
          updatedAt: nowIso,
        })
        .onConflictDoUpdate({
          target: schema.creditScores.walletHash,
          set: {
            score: record.score,
            scoreTier: record.tier,
            dimensions: record.dimensions,
            dataSource: SCORE_DATA_SOURCE,
            stale: record.stale,
            computedAt: record.computedAt,
            expiresAt: record.expiresAt,
            updatedAt: nowIso,
          },
        });
    },
  };
}

export async function resolveScoreWithCache(options: ResolveScoreWithCacheOptions) {
  const activeLogger = options.logger ?? logger;
  const now = options.now ?? new Date();
  const scoreComputer = options.scoreComputer ?? computeScore;
  const store = options.store ?? createDrizzleScoreCacheStore();
  const walletHash = createWalletHash(options.wallet);
  let cachedScore: CachedScoreRecord | null = null;

  try {
    cachedScore = await store.findByWalletHash(walletHash);
  } catch (error) {
    activeLogger.error(
      {
        error: error instanceof Error ? error.message : String(error),
        operation: 'score_cache_lookup',
        walletHash,
      },
      'score cache lookup failed'
    );
  }

  if (!cachedScore) {
    const freshScore = await computeAndPersistScore(
      walletHash,
      options.walletDataLoader,
      store,
      scoreComputer,
      activeLogger
    );

    activeLogger.info(
      { cache_hit: false, operation: 'score_cache_lookup', walletHash },
      'score cache miss'
    );
    return withCacheMetadata(freshScore, false);
  }

  if (!isScoreExpired(cachedScore, now)) {
    activeLogger.info(
      { cache_hit: true, operation: 'score_cache_lookup', walletHash },
      'score cache hit'
    );
    return withCacheMetadata(cachedScore, true);
  }

  void computeAndPersistScore(
    walletHash,
    options.walletDataLoader,
    store,
    scoreComputer,
    activeLogger
  ).catch((error) => {
    activeLogger.error(
      {
        cache_hit: true,
        error: error instanceof Error ? error.message : String(error),
        operation: 'score_cache_refresh',
        walletHash,
      },
      'score cache refresh failed'
    );
  });

  activeLogger.info(
    { cache_hit: true, operation: 'score_cache_lookup', stale: true, walletHash },
    'score cache stale'
  );
  return withCacheMetadata({ ...cachedScore, stale: true }, true);
}
