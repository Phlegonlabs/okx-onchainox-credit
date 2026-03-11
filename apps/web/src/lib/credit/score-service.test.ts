import { afterEach, describe, expect, it, vi } from 'vitest';

const { resolveScoreWithCache } = vi.hoisted(() => ({
  resolveScoreWithCache: vi.fn(),
}));

vi.mock('./score-cache', () => ({
  resolveScoreWithCache,
}));

const TEST_WALLET = '0x1234567890AbcdEF1234567890aBcdef12345678';
const LIVE_SCORE = {
  computedAt: '2026-03-10T00:00:00.000Z',
  dimensions: {
    assetScale: 72,
    multichain: 68,
    positionStability: 74,
    repaymentHistory: 81,
    walletAge: 77,
  },
  expiresAt: '2026-03-11T00:00:00.000Z',
  score: 720,
  stale: false,
  tier: 'good' as const,
  wallet: TEST_WALLET,
};

afterEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  vi.unstubAllEnvs();
});

describe('resolveWalletScore', () => {
  it('returns a local mock score when LOCAL_INTEGRATION_MODE=mock', async () => {
    vi.stubEnv('LOCAL_INTEGRATION_MODE', 'mock');
    vi.stubEnv('NODE_ENV', 'development');
    resolveScoreWithCache.mockImplementation(async (options) => {
      const data = await options.walletDataLoader();
      return {
        ...(await options.scoreComputer(data)),
        cacheHit: false,
        stale: false,
        walletHash: 'mock-wallet-hash',
      };
    });

    const { resolveWalletScore } = await import('./score-service');
    const result = await resolveWalletScore(TEST_WALLET);

    expect(resolveScoreWithCache).toHaveBeenCalledWith(
      expect.objectContaining({
        scoreComputer: expect.any(Function),
        wallet: TEST_WALLET,
        walletDataLoader: expect.any(Function),
      })
    );
    expect(result).toMatchObject({
      score: 742,
      stale: false,
      tier: 'good',
      wallet: TEST_WALLET,
    });
  });

  it('delegates to the cache-backed loader in real mode', async () => {
    vi.stubEnv('LOCAL_INTEGRATION_MODE', 'real');
    vi.stubEnv('NODE_ENV', 'development');
    resolveScoreWithCache.mockResolvedValue(LIVE_SCORE);

    const { resolveWalletScore } = await import('./score-service');
    const result = await resolveWalletScore(TEST_WALLET);

    expect(resolveScoreWithCache).toHaveBeenCalledWith(
      expect.objectContaining({
        wallet: TEST_WALLET,
      })
    );
    expect(result).toBe(LIVE_SCORE);
  });

  it('fails closed when production is configured to use mock mode', async () => {
    vi.stubEnv('LOCAL_INTEGRATION_MODE', 'mock');
    vi.stubEnv('NODE_ENV', 'production');
    resolveScoreWithCache.mockResolvedValue(LIVE_SCORE);

    const { resolveWalletScore } = await import('./score-service');

    await expect(resolveWalletScore(TEST_WALLET)).rejects.toThrow(
      'LOCAL_INTEGRATION_MODE=mock is not allowed in production'
    );
    expect(resolveScoreWithCache).not.toHaveBeenCalled();
  });
});
