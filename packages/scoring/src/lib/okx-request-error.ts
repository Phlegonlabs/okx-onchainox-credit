export class OkxRequestError extends Error {
  readonly retryAfterMs: number | undefined;
  readonly statusCode: number | undefined;

  constructor(
    message: string,
    options: {
      retryAfterMs?: number;
      statusCode?: number;
    } = {}
  ) {
    super(message);
    this.name = 'OkxRequestError';
    this.retryAfterMs = options.retryAfterMs;
    this.statusCode = options.statusCode;
  }
}

export function readRetryAfterMs(value: string | null): number | undefined {
  if (!value) {
    return undefined;
  }

  const seconds = Number(value);

  if (Number.isFinite(seconds) && seconds > 0) {
    return Math.ceil(seconds * 1_000);
  }

  const absoluteTime = Date.parse(value);

  if (Number.isNaN(absoluteTime)) {
    return undefined;
  }

  return Math.max(0, absoluteTime - Date.now());
}
