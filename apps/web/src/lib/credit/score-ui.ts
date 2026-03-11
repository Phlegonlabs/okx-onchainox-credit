import type { ScoreApiError } from './score-client';

const scoreActionMessages: Record<string, string> = {
  INVALID_INPUT: 'The wallet address is invalid. Reconnect and retry the paid score request.',
  INVALID_PAYMENT:
    'The payment receipt could not be verified. Settle the x402 request again and paste the latest receipt.',
  PAYMENT_REQUIRED:
    'Approve the x402 payment request, then submit the settlement receipt to unlock the score.',
  RATE_LIMITED:
    'This payer hit the score query limit. Wait for the retry window, then resubmit the receipt.',
  SCORE_QUERY_FAILED: 'Score retrieval did not complete. Retry the paid query in a moment.',
  UNAUTHORIZED: 'The wallet session expired. Reconnect the wallet from the home screen and retry.',
};

export function getScoreActionMessage(error: ScoreApiError | null | undefined): string {
  if (!error) {
    return 'Paid score retrieval is temporarily unavailable. Retry in a moment.';
  }

  return (
    scoreActionMessages[error.code] ??
    'Paid score retrieval is temporarily unavailable. Retry in a moment.'
  );
}
