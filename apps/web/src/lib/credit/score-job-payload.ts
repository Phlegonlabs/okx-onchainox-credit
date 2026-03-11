import type { SignedScoreQueryPayload } from '@/lib/enterprise/score-payload';

export type ScoreJobStatus = 'pending' | 'processing' | 'retry_wait' | 'completed' | 'failed';

export interface ScoreProcessingPayload {
  attemptCount: number;
  jobToken: string;
  kind: 'processing';
  nextAttemptAt?: string;
  status: Exclude<ScoreJobStatus, 'completed' | 'failed'>;
  statusMessage?: string;
  statusUrl: string;
  streamUrl: string;
}

export interface ScoreCompletedPayload {
  attemptCount: number;
  kind: 'completed';
  result: SignedScoreQueryPayload;
  status: 'completed';
  statusMessage?: string;
}

export interface ScoreFailedPayload {
  attemptCount: number;
  error: {
    code: 'SCORE_JOB_FAILED';
    details?: {
      reason?: string;
    };
    message: string;
  };
  kind: 'failed';
  status: 'failed';
  statusMessage?: string;
}

export type ScoreJobSnapshot = ScoreCompletedPayload | ScoreFailedPayload | ScoreProcessingPayload;

export function isScoreJobStatus(value: unknown): value is ScoreJobStatus {
  return (
    value === 'pending' ||
    value === 'processing' ||
    value === 'retry_wait' ||
    value === 'completed' ||
    value === 'failed'
  );
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}

export function isScoreProcessingPayload(value: unknown): value is ScoreProcessingPayload {
  if (!isObject(value)) {
    return false;
  }

  return (
    value.kind === 'processing' &&
    typeof value.jobToken === 'string' &&
    typeof value.statusUrl === 'string' &&
    typeof value.streamUrl === 'string' &&
    typeof value.attemptCount === 'number' &&
    (value.status === 'pending' || value.status === 'processing' || value.status === 'retry_wait')
  );
}

export function isScoreCompletedPayload(value: unknown): value is ScoreCompletedPayload {
  if (!isObject(value) || value.kind !== 'completed' || value.status !== 'completed') {
    return false;
  }

  return typeof value.attemptCount === 'number' && isObject(value.result);
}

export function isScoreFailedPayload(value: unknown): value is ScoreFailedPayload {
  if (!isObject(value) || value.kind !== 'failed' || value.status !== 'failed') {
    return false;
  }

  return (
    typeof value.attemptCount === 'number' &&
    isObject(value.error) &&
    value.error.code === 'SCORE_JOB_FAILED' &&
    typeof value.error.message === 'string'
  );
}

export function isScoreJobSnapshot(value: unknown): value is ScoreJobSnapshot {
  return (
    isScoreProcessingPayload(value) || isScoreCompletedPayload(value) || isScoreFailedPayload(value)
  );
}
