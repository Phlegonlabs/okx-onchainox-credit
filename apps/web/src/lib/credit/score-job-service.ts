import { randomUUID } from 'node:crypto';
import { signCredential } from '@/lib/credential/signing';
import {
  type ScoreCacheStore,
  createDrizzleScoreCacheStore,
  getCachedScoreSnapshot,
} from '@/lib/credit/score-cache';
import type { ScoreJobSnapshot, ScoreProcessingPayload } from '@/lib/credit/score-job-payload';
import {
  type ScoreJobRecord,
  type ScoreJobStore,
  createDrizzleScoreJobStore,
} from '@/lib/credit/score-job-store';
import { createScoreJobToken, readScoreJobToken } from '@/lib/credit/score-job-token';
import { computeLiveWalletScore } from '@/lib/credit/score-service';
import { logEnterpriseApiQuery } from '@/lib/enterprise/audit';
import {
  type SignedScoreQueryPayload,
  createScoreQueryPayload,
} from '@/lib/enterprise/score-payload';
import { isLocalMockMode } from '@/lib/local-integration';
import { logger } from '@/lib/logger';
import { classifyPaidOperationFailure } from '@/lib/paid-operation-failure';
import { createWalletHash } from '@/lib/wallet/hash';
import type { OkxClient } from '@graxis/scoring';

const MAX_AUTOMATIC_ATTEMPTS = 8;

function createActiveJobKey(payer: string, walletHash: string): string {
  return `${payer}:${walletHash}`;
}

function getRetryDelayMs(attemptCount: number): number {
  const cappedAttempt = Math.min(Math.max(attemptCount, 1), 6);
  return 1_000 * 2 ** cappedAttempt;
}

function shouldRetry(reason: string, attemptCount: number): boolean {
  return (
    attemptCount < MAX_AUTOMATIC_ATTEMPTS &&
    (reason === 'okx_timeout' || reason === 'okx_upstream_error')
  );
}

function buildFailureMessage(reason: string | null): string {
  if (reason === 'signer_unavailable') {
    return 'Report signing is temporarily unavailable.';
  }

  if (reason === 'okx_timeout' || reason === 'okx_upstream_error') {
    return 'OKX OnchainOS is temporarily unavailable for this report.';
  }

  return 'Credit report generation failed.';
}

async function buildSignedPayload(
  wallet: string,
  score: Awaited<ReturnType<typeof computeLiveWalletScore>>
): Promise<SignedScoreQueryPayload> {
  const payload = createScoreQueryPayload(wallet, {
    ...score,
    stale: false,
  });
  const signature = isLocalMockMode()
    ? '0xlocalmockcredentialsignature'
    : await signCredential(payload);

  return {
    ...payload,
    signature,
  };
}

export interface ScoreJobContext {
  cacheStore?: ScoreCacheStore;
  client?: OkxClient;
  jobStore?: ScoreJobStore;
  now?: Date;
  requestId?: string;
}

export interface ScoreJobHandle {
  created: boolean;
  job: ScoreJobRecord;
  jobToken: string;
}

export async function createOrReuseScoreJob(
  wallet: string,
  payer: string,
  options: Pick<ScoreJobContext, 'jobStore' | 'now'> = {}
): Promise<ScoreJobHandle> {
  const activeStore = options.jobStore ?? createDrizzleScoreJobStore();
  const now = options.now ?? new Date();
  const walletHash = createWalletHash(wallet);
  const activeKey = createActiveJobKey(payer, walletHash);
  const existingJob = await activeStore.findActiveByKey(activeKey);

  if (existingJob) {
    return {
      created: false,
      job: existingJob,
      jobToken: createScoreJobToken(existingJob.id, wallet),
    };
  }

  const jobId = randomUUID();
  const createdJob = await activeStore.createPendingJob({
    activeKey,
    createdAt: now.toISOString(),
    id: jobId,
    payer,
    statusMessage: 'Payment accepted. Queueing credit report generation.',
    walletHash,
  });

  if (createdJob) {
    return {
      created: true,
      job: createdJob,
      jobToken: createScoreJobToken(createdJob.id, wallet),
    };
  }

  const conflictedJob = await activeStore.findActiveByKey(activeKey);

  if (!conflictedJob) {
    throw new Error(`Failed to create or reuse score job for ${walletHash}`);
  }

  return {
    created: false,
    job: conflictedJob,
    jobToken: createScoreJobToken(conflictedJob.id, wallet),
  };
}

export async function markScoreJobSettled(
  jobId: string,
  x402Tx: string,
  options: Pick<ScoreJobContext, 'jobStore' | 'now'> = {}
): Promise<ScoreJobRecord> {
  const activeStore = options.jobStore ?? createDrizzleScoreJobStore();
  const now = options.now ?? new Date();

  return activeStore.markPendingSettlement({
    jobId,
    nowIso: now.toISOString(),
    statusMessage: 'Payment accepted. Preparing OKX OnchainOS collection.',
    x402Tx,
  });
}

export async function markScoreJobSettlementFailed(
  jobId: string,
  options: Pick<ScoreJobContext, 'jobStore' | 'now'> = {}
): Promise<ScoreJobRecord> {
  const activeStore = options.jobStore ?? createDrizzleScoreJobStore();
  const now = options.now ?? new Date();

  return activeStore.markSettlementFailed({
    jobId,
    nowIso: now.toISOString(),
    statusMessage: 'Payment settlement failed before the report started.',
  });
}

export async function readScoreJobByToken(
  token: string,
  options: Pick<ScoreJobContext, 'jobStore'> = {}
): Promise<ScoreJobRecord | null> {
  const payload = readScoreJobToken(token);

  if (!payload) {
    return null;
  }

  const activeStore = options.jobStore ?? createDrizzleScoreJobStore();
  return activeStore.findById(payload.jobId);
}

export function buildScoreJobSnapshot(
  job: ScoreJobRecord,
  jobToken: string,
  origin: string
): ScoreJobSnapshot {
  if (job.status === 'completed' && job.resultPayload) {
    return {
      attemptCount: job.attemptCount,
      kind: 'completed',
      result: job.resultPayload,
      status: 'completed',
      ...(job.statusMessage ? { statusMessage: job.statusMessage } : {}),
    };
  }

  if (job.status === 'failed') {
    return {
      attemptCount: job.attemptCount,
      error: {
        code: 'SCORE_JOB_FAILED',
        ...(job.lastErrorReason ? { details: { reason: job.lastErrorReason } } : {}),
        message: buildFailureMessage(job.lastErrorReason),
      },
      kind: 'failed',
      status: 'failed',
      ...(job.statusMessage ? { statusMessage: job.statusMessage } : {}),
    };
  }

  const processingPayload: ScoreProcessingPayload = {
    attemptCount: job.attemptCount,
    jobToken,
    kind: 'processing',
    status:
      job.status === 'retry_wait'
        ? 'retry_wait'
        : job.status === 'processing'
          ? 'processing'
          : 'pending',
    statusUrl: `${origin}/api/v1/score/jobs/${encodeURIComponent(jobToken)}`,
    streamUrl: `${origin}/api/v1/score/jobs/${encodeURIComponent(jobToken)}/events`,
  };

  if (job.nextAttemptAt) {
    processingPayload.nextAttemptAt = job.nextAttemptAt;
  }

  if (job.statusMessage) {
    processingPayload.statusMessage = job.statusMessage;
  }

  return processingPayload;
}

export async function advanceScoreJob(
  token: string,
  options: ScoreJobContext = {}
): Promise<ScoreJobRecord | null> {
  const tokenPayload = readScoreJobToken(token);

  if (!tokenPayload) {
    return null;
  }

  const activeStore = options.jobStore ?? createDrizzleScoreJobStore();
  const cacheStore = options.cacheStore ?? createDrizzleScoreCacheStore();
  const currentJob = await activeStore.findById(tokenPayload.jobId);
  const now = options.now ?? new Date();

  if (!currentJob) {
    return null;
  }

  if (currentJob.status === 'completed' || currentJob.status === 'failed') {
    return currentJob;
  }

  if (
    currentJob.status === 'retry_wait' &&
    currentJob.nextAttemptAt &&
    Date.parse(currentJob.nextAttemptAt) > now.getTime()
  ) {
    return currentJob;
  }

  const lockToken = randomUUID();
  const claimedJob = await activeStore.claimForProcessing({
    jobId: currentJob.id,
    lockToken,
    nowIso: now.toISOString(),
    statusMessage:
      currentJob.attemptCount > 0
        ? 'Retrying OKX OnchainOS collection.'
        : 'Collecting wallet history from OKX OnchainOS.',
  });

  if (!claimedJob) {
    return activeStore.findById(currentJob.id);
  }

  const attemptCount = claimedJob.attemptCount + 1;

  try {
    const cachedScore = await getCachedScoreSnapshot({
      now,
      store: cacheStore,
      wallet: tokenPayload.wallet,
    });
    if (cachedScore.freshness === 'fresh' && cachedScore.record) {
      const signedPayload = await buildSignedPayload(tokenPayload.wallet, {
        computedAt: cachedScore.record.computedAt,
        dataGaps: [],
        dimensions: cachedScore.record.dimensions,
        expiresAt: cachedScore.record.expiresAt,
        score: cachedScore.record.score,
        tier: cachedScore.record.tier,
        wallet: tokenPayload.wallet,
      });
      const completedJob = await activeStore.saveCompletedResult({
        attemptCount,
        jobId: claimedJob.id,
        lockToken,
        nowIso: now.toISOString(),
        resultPayload: signedPayload,
        statusMessage: 'Credit report ready.',
      });

      try {
        await logEnterpriseApiQuery({
          metadata: {
            stale: false,
          },
          payer: completedJob.payer,
          resource: 'score_query',
          scoreTier: signedPayload.tier,
          walletHash: completedJob.walletHash,
          x402Tx: completedJob.x402Tx,
        });
      } catch (error) {
        logger.error(
          {
            error: error instanceof Error ? error.message : String(error),
            operation: 'score_job.audit',
            payer: completedJob.payer,
            requestId: options.requestId,
            walletHash: completedJob.walletHash,
            x402Tx: completedJob.x402Tx,
          },
          'score job audit log failed'
        );
      }

      return completedJob;
    }
  } catch {
    // Fall through to live generation when the cache path is unavailable.
  }

  try {
    const score = await computeLiveWalletScore(tokenPayload.wallet, options.client);
    const signedPayload = await buildSignedPayload(tokenPayload.wallet, score);

    try {
      await cacheStore.upsert({
        ...score,
        stale: false,
        walletHash: claimedJob.walletHash,
      });
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
          operation: 'score_job.cache_write',
          walletHash: claimedJob.walletHash,
        },
        'score job cache write failed'
      );
    }

    const completedJob = await activeStore.saveCompletedResult({
      attemptCount,
      jobId: claimedJob.id,
      lockToken,
      nowIso: now.toISOString(),
      resultPayload: signedPayload,
      statusMessage: 'Credit report ready.',
    });

    try {
      await logEnterpriseApiQuery({
        metadata: {
          stale: false,
        },
        payer: completedJob.payer,
        resource: 'score_query',
        scoreTier: signedPayload.tier,
        walletHash: completedJob.walletHash,
        x402Tx: completedJob.x402Tx,
      });
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
          operation: 'score_job.audit',
          payer: completedJob.payer,
          requestId: options.requestId,
          walletHash: completedJob.walletHash,
          x402Tx: completedJob.x402Tx,
        },
        'score job audit log failed'
      );
    }

    return completedJob;
  } catch (error) {
    const reason = classifyPaidOperationFailure(error, 'score_preparation_failed');
    if (shouldRetry(reason, attemptCount)) {
      const nextAttemptAt = new Date(now.getTime() + getRetryDelayMs(attemptCount)).toISOString();

      return activeStore.markRetryWait({
        attemptCount,
        jobId: claimedJob.id,
        lastErrorReason: reason,
        lockToken,
        nextAttemptAt,
        nowIso: now.toISOString(),
        statusMessage: 'Waiting for the next OKX OnchainOS retry window.',
      });
    }

    logger.error(
      {
        error: error instanceof Error ? error.message : String(error),
        operation: 'score_job.advance',
        payer: claimedJob.payer,
        reason,
        requestId: options.requestId,
        walletHash: claimedJob.walletHash,
        x402Tx: claimedJob.x402Tx,
      },
      'score job failed'
    );

    return activeStore.markFailed({
      attemptCount,
      jobId: claimedJob.id,
      lastErrorReason: reason,
      lockToken,
      nowIso: now.toISOString(),
      statusMessage: buildFailureMessage(reason),
    });
  }
}
