import { db, schema } from '@/lib/db';
import { RateLimitError } from '@/lib/errors';
import { and, count, eq, gte, lt } from 'drizzle-orm';

const DEFAULT_ENTERPRISE_RATE_LIMIT = 100;
const DEFAULT_WINDOW_SECONDS = 60;
const DEFAULT_RETENTION_SECONDS = 10 * 60;

interface RateLimitCheckInput {
  maxRequests: number;
  now: Date;
  payer: string;
  resource: string;
  retentionSeconds: number;
  windowSeconds: number;
}

interface RateLimitWindowCheck {
  allowed: boolean;
  requestCount: number;
}

export interface EnterpriseRateLimitStore {
  runWindowCheck(input: RateLimitCheckInput): Promise<RateLimitWindowCheck>;
}

export interface EnterpriseRateLimitOptions {
  maxRequests?: number;
  now?: Date;
  payer: string;
  resource: string;
  retentionSeconds?: number;
  store?: EnterpriseRateLimitStore;
  windowSeconds?: number;
}

export function createDrizzleEnterpriseRateLimitStore(
  database: typeof db = db
): EnterpriseRateLimitStore {
  return {
    async runWindowCheck(input) {
      const nowIso = input.now.toISOString();
      const windowStartIso = new Date(
        input.now.getTime() - input.windowSeconds * 1_000
      ).toISOString();
      const retentionCutoffIso = new Date(
        input.now.getTime() - input.retentionSeconds * 1_000
      ).toISOString();

      return database.transaction(async (tx) => {
        await tx
          .delete(schema.apiRateLimits)
          .where(lt(schema.apiRateLimits.createdAt, retentionCutoffIso));

        const [result] = await tx
          .select({ value: count() })
          .from(schema.apiRateLimits)
          .where(
            and(
              eq(schema.apiRateLimits.payer, input.payer),
              gte(schema.apiRateLimits.createdAt, windowStartIso)
            )
          );
        const requestCount = result?.value ?? 0;

        if (requestCount >= input.maxRequests) {
          return {
            allowed: false,
            requestCount,
          };
        }

        await tx.insert(schema.apiRateLimits).values({
          createdAt: nowIso,
          payer: input.payer,
          resource: input.resource,
        });

        return {
          allowed: true,
          requestCount: requestCount + 1,
        };
      });
    },
  };
}

export async function checkEnterpriseRateLimit(options: EnterpriseRateLimitOptions): Promise<
  | { ok: true; requestCount: number }
  | {
      error: RateLimitError;
      ok: false;
      retryAfterSeconds: number;
    }
> {
  const maxRequests = options.maxRequests ?? DEFAULT_ENTERPRISE_RATE_LIMIT;
  const now = options.now ?? new Date();
  const retentionSeconds = options.retentionSeconds ?? DEFAULT_RETENTION_SECONDS;
  const store = options.store ?? createDrizzleEnterpriseRateLimitStore();
  const windowSeconds = options.windowSeconds ?? DEFAULT_WINDOW_SECONDS;
  const result = await store.runWindowCheck({
    maxRequests,
    now,
    payer: options.payer,
    resource: options.resource,
    retentionSeconds,
    windowSeconds,
  });

  if (!result.allowed) {
    return {
      error: new RateLimitError('Enterprise API rate limit exceeded.', {
        limit: maxRequests,
        retryAfterSeconds: windowSeconds,
        windowSeconds,
      }),
      ok: false,
      retryAfterSeconds: windowSeconds,
    };
  }

  return {
    ok: true,
    requestCount: result.requestCount,
  };
}
