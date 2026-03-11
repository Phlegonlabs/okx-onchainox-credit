import { OkxRequestError } from './okx-request-error.js';

const DEFAULT_OKX_RETRY_DELAYS_MS = [250, 750] as const;

function sleep(delayMs: number): Promise<void> {
  if (delayMs <= 0) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

export function normalizeOkxRetryDelays(delays?: readonly number[]): number[] {
  if (!delays?.length) {
    return [...DEFAULT_OKX_RETRY_DELAYS_MS];
  }

  return delays.map((delay) => Math.max(0, Math.trunc(delay)));
}

export function isRetryableOkxRequestError(error: unknown): boolean {
  if (error instanceof OkxRequestError) {
    return error.statusCode === 429 || (error.statusCode !== undefined && error.statusCode >= 500);
  }

  if (!(error instanceof Error)) {
    return false;
  }

  if (error.message === 'OKX_API_TIMEOUT') {
    return true;
  }

  if (error.name === 'TypeError' || error.message === 'fetch failed') {
    return true;
  }

  return /^OKX API error: 5\d\d\b/.test(error.message);
}

export async function retryOkxRequest<T>(
  operation: () => Promise<T>,
  retryDelaysMs: readonly number[]
): Promise<T> {
  let attempt = 0;

  while (true) {
    try {
      return await operation();
    } catch (error) {
      const retryable = isRetryableOkxRequestError(error);
      const configuredDelayMs = retryDelaysMs[attempt];
      const delayMs =
        error instanceof OkxRequestError && error.retryAfterMs !== undefined
          ? error.retryAfterMs
          : configuredDelayMs;
      if (delayMs === undefined || !retryable) {
        throw error;
      }

      attempt += 1;
      await sleep(delayMs);
    }
  }
}
