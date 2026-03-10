import type { CredentialApiError } from './client';

const credentialActionMessages: Record<string, string> = {
  CREDENTIAL_ISSUANCE_FAILED:
    'Credential issuance did not complete. Verify the wallet session is still active, then retry.',
  INVALID_PAYMENT_RECEIPT:
    'The payment receipt could not be verified. Settle the x402 request again and paste the latest receipt.',
  PAYMENT_REQUIRED:
    'Approve the x402 payment request, then submit the settlement receipt to continue.',
  SCORE_UNAVAILABLE:
    'The latest score is not available yet. Refresh the dashboard and try again in a few minutes.',
  UNAUTHORIZED:
    'The wallet session expired. Reconnect the wallet from the home screen and try again.',
};

export function getCredentialActionMessage(error: CredentialApiError | null | undefined): string {
  if (!error) {
    return 'Credential issuance is temporarily unavailable. Retry in a moment.';
  }

  return (
    credentialActionMessages[error.code] ??
    'Credential issuance is temporarily unavailable. Retry in a moment.'
  );
}
