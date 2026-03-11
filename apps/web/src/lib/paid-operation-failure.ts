export type PaidOperationFailureReason =
  | 'credential_preparation_failed'
  | 'credential_verification_failed'
  | 'okx_timeout'
  | 'okx_upstream_error'
  | 'score_preparation_failed'
  | 'signer_unavailable';

function readErrorMessage(error: unknown): string | null {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = error.message;

    if (typeof message === 'string') {
      return message;
    }
  }

  return null;
}

function isOkxUpstreamFailure(error: unknown, message: string): boolean {
  if (error instanceof TypeError || message === 'fetch failed') {
    return true;
  }

  return (
    message === 'OKX_API_TIMEOUT' ||
    message.startsWith('OKX API error:') ||
    message.startsWith('OKX x402 API error:') ||
    message.includes('OKX_API_KEY') ||
    message.includes('OKX_SECRET_KEY') ||
    message.includes('OKX_PASSPHRASE')
  );
}

export function classifyPaidOperationFailure(
  error: unknown,
  fallback: PaidOperationFailureReason
): PaidOperationFailureReason {
  const message = readErrorMessage(error);

  if (!message) {
    return fallback;
  }

  if (message === 'OKX_API_TIMEOUT') {
    return 'okx_timeout';
  }

  if (isOkxUpstreamFailure(error, message)) {
    return 'okx_upstream_error';
  }

  if (message.startsWith('ECDSA_')) {
    return 'signer_unavailable';
  }

  return fallback;
}

export function readPaidOperationFailureReason(
  details: unknown
): PaidOperationFailureReason | null {
  if (!details || typeof details !== 'object' || !('reason' in details)) {
    return null;
  }

  const reason = details.reason;

  return typeof reason === 'string' ? (reason as PaidOperationFailureReason) : null;
}
