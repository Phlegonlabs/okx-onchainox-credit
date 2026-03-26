import type { RawWalletData, Score } from '@graxis/scoring';
import { describe, expect, it, vi } from 'vitest';
import { type CachedScoreRecord, type ScoreCacheStore, resolveScoreWithCache } from './score-cache';

function createScore(overrides: Partial<CachedScoreRecord> = {}): CachedScoreRecord {
  return {
    walletHash: 'wallet-hash',
    wallet: '0xabc',
    score: 720,
    tier: 'good',
    dimensions: {
      walletAge: 90,
      assetScale: 80,
      positionStability: 70,
      repaymentHistory: 75,
      multichain: 60,
    },
    computedAt: '2026-03-09T00:00:00.000Z',
    expiresAt: '2026-03-10T00:00:00.000Z',
    stale: false,
    ...overrides,
  };
}

function createStore(seed: CachedScoreRecord | null): ScoreCacheStore {
  let record = seed;

  return {
    async findByWalletHash() {
      return record;
    },
    async upsert(nextRecord) {
      record = nextRecord;
    },
  };
}

function createWalletData(): RawWalletData {
  return {
    wallet: '0xabc',
    events: [],
    defiEvents: [],
    positions: [],
    totalValueUsd: 0,
    hasDeFiPositions: false,
    activeChains: [],
  };
}

describe('resolveScoreWithCache', () => {
  it('computes and persists a fresh score on cache miss', async () => {
    const store = createStore(null);
    const logger = { info: vi.fn(), error: vi.fn() };
    const scoreComputer = vi.fn<() => Promise<Score>>().mockResolvedValue(createScore());

    const result = await resolveScoreWithCache({
      wallet: '0xabc',
      walletDataLoader: async () => createWalletData(),
      store,
      logger,
      scoreComputer,
      now: new Date('2026-03-09T12:00:00.000Z'),
    });

    expect(result.cacheHit).toBe(false);
    expect(result.stale).toBe(false);
    expect(scoreComputer).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({ cache_hit: false }),
      'score cache miss'
    );
  });

  it('returns fresh cached scores without recomputing', async () => {
    const store = createStore(createScore());
    const logger = { info: vi.fn(), error: vi.fn() };
    const scoreComputer = vi.fn<() => Promise<Score>>();

    const result = await resolveScoreWithCache({
      wallet: '0xabc',
      walletDataLoader: async () => createWalletData(),
      store,
      logger,
      scoreComputer,
      now: new Date('2026-03-09T12:00:00.000Z'),
    });

    expect(result.cacheHit).toBe(true);
    expect(result.stale).toBe(false);
    expect(scoreComputer).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({ cache_hit: true }),
      'score cache hit'
    );
  });

  it('returns stale cached scores and refreshes in the background', async () => {
    const store = createStore(
      createScore({
        expiresAt: '2026-03-08T00:00:00.000Z',
      })
    );
    const logger = { info: vi.fn(), error: vi.fn() };
    const scoreComputer = vi.fn<() => Promise<Score>>().mockResolvedValue(
      createScore({
        computedAt: '2026-03-09T12:00:00.000Z',
        expiresAt: '2026-03-10T12:00:00.000Z',
      })
    );

    const result = await resolveScoreWithCache({
      wallet: '0xabc',
      walletDataLoader: async () => createWalletData(),
      store,
      logger,
      scoreComputer,
      now: new Date('2026-03-09T12:00:00.000Z'),
    });
    await Promise.resolve();

    expect(result.cacheHit).toBe(true);
    expect(result.stale).toBe(true);
    expect(scoreComputer).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({ cache_hit: true, stale: true }),
      'score cache stale'
    );
  });

  it('computes a fresh score when cache lookup fails', async () => {
    const store: ScoreCacheStore = {
      async findByWalletHash() {
        throw new Error('db unavailable');
      },
      async upsert() {
        return undefined;
      },
    };
    const logger = { info: vi.fn(), error: vi.fn() };
    const scoreComputer = vi.fn<() => Promise<Score>>().mockResolvedValue(createScore());

    const result = await resolveScoreWithCache({
      wallet: '0xabc',
      walletDataLoader: async () => createWalletData(),
      store,
      logger,
      scoreComputer,
      now: new Date('2026-03-09T12:00:00.000Z'),
    });

    expect(result.cacheHit).toBe(false);
    expect(result.score).toBe(720);
    expect(scoreComputer).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ operation: 'score_cache_lookup' }),
      'score cache lookup failed'
    );
  });

  it('returns a fresh score when cache writes fail', async () => {
    const store: ScoreCacheStore = {
      async findByWalletHash() {
        return null;
      },
      async upsert() {
        throw new Error('write failed');
      },
    };
    const logger = { info: vi.fn(), error: vi.fn() };
    const scoreComputer = vi.fn<() => Promise<Score>>().mockResolvedValue(createScore());

    const result = await resolveScoreWithCache({
      wallet: '0xabc',
      walletDataLoader: async () => createWalletData(),
      store,
      logger,
      scoreComputer,
      now: new Date('2026-03-09T12:00:00.000Z'),
    });

    expect(result.cacheHit).toBe(false);
    expect(result.stale).toBe(false);
    expect(scoreComputer).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ operation: 'score_cache_write' }),
      'score cache write failed'
    );
  });
});
