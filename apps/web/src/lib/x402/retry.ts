const DEFAULT_X402_RETRY_DELAYS_MS = [250, 750] as const;

function sleep(delayMs: number): Promise<void> {
  if (delayMs <= 0) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

export function normalizeX402RetryDelays(delays?: readonly number[]): number[] {
  if (!delays?.length) {
    return [...DEFAULT_X402_RETRY_DELAYS_MS];
  }

  return delays.map((delay) => Math.max(0, Math.trunc(delay)));
}

export function isRetryableX402RequestError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  if (error.message === 'OKX_API_TIMEOUT') {
    return true;
  }

  if (error.name === 'TypeError' || error.message === 'fetch failed') {
    return true;
  }

  return /^OKX x402 API error: 5\d\d\b/.test(error.message);
}

export async function retryX402Request<T>(
  operation: () => Promise<T>,
  retryDelaysMs: readonly number[]
): Promise<T> {
  let attempt = 0;

  while (true) {
    try {
      return await operation();
    } catch (error) {
      const delayMs = retryDelaysMs[attempt];
      if (delayMs === undefined || !isRetryableX402RequestError(error)) {
        throw error;
      }

      attempt += 1;
      await sleep(delayMs);
    }
  }
}
