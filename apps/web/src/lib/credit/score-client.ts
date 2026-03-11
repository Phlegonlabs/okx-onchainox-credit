import type { SignedScoreQueryPayload } from '@/lib/enterprise/score-payload';
import { type PaymentRequiredDetails, isPaymentRequiredDetails } from '@/lib/x402/payment-required';
import {
  type ScoreJobSnapshot,
  type ScoreProcessingPayload,
  isScoreJobSnapshot,
  isScoreProcessingPayload,
} from './score-job-payload';

export interface ScoreApiError {
  code: string;
  details?: unknown;
  message: string;
}

export type ScoreApiResult =
  | { kind: 'error'; error: ScoreApiError }
  | {
      error: ScoreApiError;
      kind: 'payment_required';
      paymentRequired: PaymentRequiredDetails;
    }
  | {
      kind: 'processing';
      processing: ScoreProcessingPayload;
    }
  | {
      kind: 'paid_score';
      score: SignedScoreQueryPayload;
    };

const SCORE_DIMENSION_KEYS = [
  'assetScale',
  'multichain',
  'positionStability',
  'repaymentHistory',
  'walletAge',
] as const;

function isSignedScoreQueryPayload(value: unknown): value is SignedScoreQueryPayload {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<SignedScoreQueryPayload> & {
    breakdown?: Record<string, unknown>;
  };

  return (
    typeof candidate.computedAt === 'string' &&
    Array.isArray(candidate.dataGaps) &&
    typeof candidate.expiresAt === 'string' &&
    typeof candidate.issuer === 'string' &&
    typeof candidate.score === 'number' &&
    typeof candidate.signature === 'string' &&
    typeof candidate.stale === 'boolean' &&
    typeof candidate.tier === 'string' &&
    typeof candidate.version === 'string' &&
    typeof candidate.wallet === 'string' &&
    !!candidate.breakdown &&
    SCORE_DIMENSION_KEYS.every((key) => typeof candidate.breakdown?.[key] === 'number')
  );
}

export function parseScoreApiResponse(status: number, value: unknown): ScoreApiResult {
  if (isSignedScoreQueryPayload(value)) {
    return {
      kind: 'paid_score',
      score: value,
    };
  }

  if (status === 202 && isScoreProcessingPayload(value)) {
    return {
      kind: 'processing',
      processing: value,
    };
  }

  const payload = value as {
    error?: ScoreApiError;
    paymentRequired?: PaymentRequiredDetails;
  };
  const error = payload?.error ?? {
    code: 'UNKNOWN_ERROR',
    message: 'Unexpected paid score response.',
  };

  if (status === 402 && isPaymentRequiredDetails(payload?.paymentRequired)) {
    return {
      error,
      kind: 'payment_required',
      paymentRequired: payload.paymentRequired,
    };
  }

  return {
    error,
    kind: 'error',
  };
}

export function parseScoreJobSnapshot(value: unknown): ScoreJobSnapshot | null {
  return isScoreJobSnapshot(value) ? value : null;
}
