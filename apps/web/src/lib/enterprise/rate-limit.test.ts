import { describe, expect, it } from 'vitest';
import { type EnterpriseRateLimitStore, checkEnterpriseRateLimit } from './rate-limit';

function createMemoryRateLimitStore() {
  const entries: Array<{ createdAt: string; payer: string; resource: string }> = [];

  const store: EnterpriseRateLimitStore = {
    async runWindowCheck(input) {
      const nowMs = input.now.getTime();
      const retentionStartMs = nowMs - input.retentionSeconds * 1_000;
      const windowStartMs = nowMs - input.windowSeconds * 1_000;

      const retainedEntries = entries.filter(
        (entry) => new Date(entry.createdAt).getTime() >= retentionStartMs
      );

      entries.splice(0, entries.length, ...retainedEntries);

      const requestCount = entries.filter(
        (entry) =>
          entry.payer === input.payer && new Date(entry.createdAt).getTime() >= windowStartMs
      ).length;

      if (requestCount >= input.maxRequests) {
        return {
          allowed: false,
          requestCount,
        };
      }

      entries.push({
        createdAt: input.now.toISOString(),
        payer: input.payer,
        resource: input.resource,
      });

      return {
        allowed: true,
        requestCount: requestCount + 1,
      };
    },
  };

  return {
    entries,
    store,
  };
}

describe('checkEnterpriseRateLimit', () => {
  it('allows requests while the payer is below the window limit', async () => {
    const { store } = createMemoryRateLimitStore();

    await expect(
      checkEnterpriseRateLimit({
        maxRequests: 2,
        now: new Date('2026-03-10T00:00:00.000Z'),
        payer: '0xpayer',
        resource: 'score_query',
        store,
      })
    ).resolves.toEqual({
      ok: true,
      requestCount: 1,
    });
  });

  it('returns a rate-limit error once the payer exhausts the window', async () => {
    const { store } = createMemoryRateLimitStore();
    const now = new Date('2026-03-10T00:00:00.000Z');

    await checkEnterpriseRateLimit({
      maxRequests: 1,
      now,
      payer: '0xpayer',
      resource: 'score_query',
      store,
    });

    await expect(
      checkEnterpriseRateLimit({
        maxRequests: 1,
        now: new Date(now.getTime() + 5_000),
        payer: '0xpayer',
        resource: 'credential_verification',
        store,
      })
    ).resolves.toMatchObject({
      error: {
        code: 'RATE_LIMITED',
      },
      ok: false,
      retryAfterSeconds: 60,
    });
  });

  it('allows the payer again once the window elapses', async () => {
    const { store } = createMemoryRateLimitStore();
    const now = new Date('2026-03-10T00:00:00.000Z');

    await checkEnterpriseRateLimit({
      maxRequests: 1,
      now,
      payer: '0xpayer',
      resource: 'score_query',
      store,
    });

    await expect(
      checkEnterpriseRateLimit({
        maxRequests: 1,
        now: new Date(now.getTime() + 61_000),
        payer: '0xpayer',
        resource: 'score_query',
        store,
      })
    ).resolves.toEqual({
      ok: true,
      requestCount: 1,
    });
  });
});
