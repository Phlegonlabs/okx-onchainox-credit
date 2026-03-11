import { readPaidOperationFailureReason } from '../paid-operation-failure';
import type { CredentialApiError } from './client';

const credentialActionMessages: Record<string, string> = {
  INVALID_PAYMENT:
    'The payment receipt could not be verified. Settle the x402 request again and paste the latest receipt.',
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

const credentialFailureReasonMessages = {
  credential_preparation_failed:
    'Credential issuance did not complete. Verify the wallet session is still active, then retry.',
  okx_timeout: 'OKX OnchainOS data fetch timed out. Retry credential issuance in a moment.',
  okx_upstream_error:
    'OKX OnchainOS data is temporarily unavailable. Retry credential issuance in a moment.',
  signer_unavailable:
    'Server signing is temporarily unavailable. Retry credential issuance in a moment.',
} as const;

export function getCredentialActionMessage(error: CredentialApiError | null | undefined): string {
  if (!error) {
    return 'Credential issuance is temporarily unavailable. Retry in a moment.';
  }

  if (error.code === 'CREDENTIAL_ISSUANCE_FAILED') {
    const reason = readPaidOperationFailureReason(error.details);

    if (reason && reason in credentialFailureReasonMessages) {
      return credentialFailureReasonMessages[
        reason as keyof typeof credentialFailureReasonMessages
      ];
    }
  }

  return (
    credentialActionMessages[error.code] ??
    'Credential issuance is temporarily unavailable. Retry in a moment.'
  );
}
