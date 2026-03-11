import { type PaymentRequiredDetails, isPaymentRequiredDetails } from '@/lib/x402/payment-required';
import { type IssuedCredential, isCredentialPayload } from './payload';

export interface CredentialApiError {
  code: string;
  details?: unknown;
  message: string;
}

export type CredentialApiResult =
  | { kind: 'issued'; credential: IssuedCredential }
  | { error: CredentialApiError; kind: 'error' }
  | {
      error: CredentialApiError;
      kind: 'payment_required';
      paymentRequired: PaymentRequiredDetails;
    };

function isIssuedCredential(value: unknown): value is IssuedCredential {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<IssuedCredential>;
  return typeof candidate.signature === 'string' && isCredentialPayload(value);
}

export function parseCredentialApiResponse(status: number, value: unknown): CredentialApiResult {
  if (isIssuedCredential(value)) {
    return {
      kind: 'issued',
      credential: value,
    };
  }

  const payload = value as {
    error?: CredentialApiError;
    paymentRequired?: PaymentRequiredDetails;
  };
  const error = payload?.error ?? {
    code: 'UNKNOWN_ERROR',
    message: 'Unexpected credential API response.',
  };

  if (status === 402 && isPaymentRequiredDetails(payload?.paymentRequired)) {
    return {
      kind: 'payment_required',
      error,
      paymentRequired: payload.paymentRequired,
    };
  }

  return {
    kind: 'error',
    error,
  };
}
