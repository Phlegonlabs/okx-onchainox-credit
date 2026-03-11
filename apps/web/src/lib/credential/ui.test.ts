import { describe, expect, it } from 'vitest';
import { getCredentialActionMessage } from './ui';

describe('getCredentialActionMessage', () => {
  it('maps known credential API errors to actionable copy', () => {
    expect(
      getCredentialActionMessage({
        code: 'INVALID_PAYMENT_RECEIPT',
        message: 'receipt failed verification',
      })
    ).toBe(
      'The payment receipt could not be verified. Settle the x402 request again and paste the latest receipt.'
    );
  });

  it('falls back to a safe generic message for unknown errors', () => {
    expect(
      getCredentialActionMessage({
        code: 'SOMETHING_NEW',
        message: 'socket hang up',
      })
    ).toBe('Credential issuance is temporarily unavailable. Retry in a moment.');
  });

  it('returns a safe generic message when no error payload is available', () => {
    expect(getCredentialActionMessage(undefined)).toBe(
      'Credential issuance is temporarily unavailable. Retry in a moment.'
    );
  });

  it('uses detailed reasons for credential issuance failures when present', () => {
    expect(
      getCredentialActionMessage({
        code: 'CREDENTIAL_ISSUANCE_FAILED',
        details: {
          reason: 'signer_unavailable',
        },
        message: 'Unable to issue credential.',
      })
    ).toBe('Server signing is temporarily unavailable. Retry credential issuance in a moment.');
  });
});
