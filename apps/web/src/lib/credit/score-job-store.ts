import { db, schema } from '@/lib/db';
import type { SignedScoreQueryPayload } from '@/lib/enterprise/score-payload';
import { and, eq, inArray, isNull, lt, or } from 'drizzle-orm';
import type { ScoreJobStatus } from './score-job-payload';

const ACTIVE_JOB_STATUSES: readonly ScoreJobStatus[] = [
  'pending',
  'processing',
  'retry_wait',
] as const;
const DEFAULT_LOCK_TIMEOUT_MS = 30_000;

export interface ScoreJobRecord {
  activeKey: string | null;
  attemptCount: number;
  completedAt: string | null;
  createdAt: string;
  id: string;
  lastErrorReason: string | null;
  lockedAt: string | null;
  lockToken: string | null;
  nextAttemptAt: string | null;
  payer: string;
  resultPayload: SignedScoreQueryPayload | null;
  status: ScoreJobStatus;
  statusMessage: string | null;
  updatedAt: string;
  walletHash: string;
  x402Tx: string | null;
}

export interface CreateScoreJobInput {
  activeKey: string;
  createdAt: string;
  id: string;
  payer: string;
  statusMessage: string;
  walletHash: string;
}

export interface ScoreJobStore {
  claimForProcessing(args: {
    jobId: string;
    lockTimeoutMs?: number;
    lockToken: string;
    nowIso: string;
    statusMessage: string;
  }): Promise<ScoreJobRecord | null>;
  createPendingJob(input: CreateScoreJobInput): Promise<ScoreJobRecord | null>;
  findActiveByKey(activeKey: string): Promise<ScoreJobRecord | null>;
  findById(jobId: string): Promise<ScoreJobRecord | null>;
  markFailed(args: {
    attemptCount: number;
    jobId: string;
    lastErrorReason: string;
    lockToken: string | null;
    nowIso: string;
    statusMessage: string;
  }): Promise<ScoreJobRecord>;
  markPendingSettlement(args: {
    jobId: string;
    nowIso: string;
    statusMessage: string;
    x402Tx: string;
  }): Promise<ScoreJobRecord>;
  markRetryWait(args: {
    attemptCount: number;
    jobId: string;
    lastErrorReason: string;
    lockToken: string;
    nextAttemptAt: string;
    nowIso: string;
    statusMessage: string;
  }): Promise<ScoreJobRecord>;
  markSettlementFailed(args: {
    jobId: string;
    nowIso: string;
    statusMessage: string;
  }): Promise<ScoreJobRecord>;
  saveCompletedResult(args: {
    attemptCount: number;
    jobId: string;
    lockToken: string | null;
    nowIso: string;
    resultPayload: SignedScoreQueryPayload;
    statusMessage: string;
  }): Promise<ScoreJobRecord>;
}

function mapRecord(record: typeof schema.scoreJobs.$inferSelect): ScoreJobRecord {
  return {
    activeKey: record.activeKey,
    attemptCount: record.attemptCount,
    completedAt: record.completedAt,
    createdAt: record.createdAt,
    id: record.id,
    lastErrorReason: record.lastErrorReason,
    lockedAt: record.lockedAt,
    lockToken: record.lockToken,
    nextAttemptAt: record.nextAttemptAt,
    payer: record.payer,
    resultPayload: (record.resultPayload ?? null) as SignedScoreQueryPayload | null,
    status: record.status as ScoreJobStatus,
    statusMessage: record.statusMessage,
    updatedAt: record.updatedAt,
    walletHash: record.walletHash,
    x402Tx: record.x402Tx,
  };
}

export function createDrizzleScoreJobStore(database: typeof db = db): ScoreJobStore {
  async function readSingle(jobId: string): Promise<ScoreJobRecord> {
    const record = await database.query.scoreJobs.findFirst({
      where: eq(schema.scoreJobs.id, jobId),
    });

    if (!record) {
      throw new Error(`Score job ${jobId} was not found`);
    }

    return mapRecord(record);
  }

  return {
    async findById(jobId) {
      const record = await database.query.scoreJobs.findFirst({
        where: eq(schema.scoreJobs.id, jobId),
      });

      return record ? mapRecord(record) : null;
    },
    async findActiveByKey(activeKey) {
      const record = await database.query.scoreJobs.findFirst({
        where: and(
          eq(schema.scoreJobs.activeKey, activeKey),
          inArray(schema.scoreJobs.status, [...ACTIVE_JOB_STATUSES])
        ),
      });

      return record ? mapRecord(record) : null;
    },
    async createPendingJob(input) {
      const [record] = await database
        .insert(schema.scoreJobs)
        .values({
          id: input.id,
          walletHash: input.walletHash,
          payer: input.payer,
          activeKey: input.activeKey,
          status: 'pending',
          statusMessage: input.statusMessage,
          attemptCount: 0,
          createdAt: input.createdAt,
          updatedAt: input.createdAt,
        })
        .onConflictDoNothing()
        .returning();

      return record ? mapRecord(record) : null;
    },
    async markPendingSettlement({ jobId, nowIso, statusMessage, x402Tx }) {
      const [record] = await database
        .update(schema.scoreJobs)
        .set({
          status: 'pending',
          statusMessage,
          updatedAt: nowIso,
          x402Tx,
        })
        .where(eq(schema.scoreJobs.id, jobId))
        .returning();

      return record ? mapRecord(record) : readSingle(jobId);
    },
    async markSettlementFailed({ jobId, nowIso, statusMessage }) {
      const [record] = await database
        .update(schema.scoreJobs)
        .set({
          activeKey: null,
          completedAt: nowIso,
          status: 'failed',
          statusMessage,
          updatedAt: nowIso,
        })
        .where(eq(schema.scoreJobs.id, jobId))
        .returning();

      return record ? mapRecord(record) : readSingle(jobId);
    },
    async claimForProcessing({
      jobId,
      lockTimeoutMs = DEFAULT_LOCK_TIMEOUT_MS,
      lockToken,
      nowIso,
      statusMessage,
    }) {
      const lockExpiryIso = new Date(Date.parse(nowIso) - lockTimeoutMs).toISOString();
      const [record] = await database
        .update(schema.scoreJobs)
        .set({
          lockToken,
          lockedAt: nowIso,
          status: 'processing',
          statusMessage,
          updatedAt: nowIso,
        })
        .where(
          and(
            eq(schema.scoreJobs.id, jobId),
            inArray(schema.scoreJobs.status, [...ACTIVE_JOB_STATUSES]),
            or(isNull(schema.scoreJobs.lockedAt), lt(schema.scoreJobs.lockedAt, lockExpiryIso))
          )
        )
        .returning();

      return record ? mapRecord(record) : null;
    },
    async markRetryWait({
      attemptCount,
      jobId,
      lastErrorReason,
      lockToken,
      nextAttemptAt,
      nowIso,
      statusMessage,
    }) {
      const [record] = await database
        .update(schema.scoreJobs)
        .set({
          attemptCount,
          lastErrorReason,
          lockToken: null,
          lockedAt: null,
          nextAttemptAt,
          status: 'retry_wait',
          statusMessage,
          updatedAt: nowIso,
        })
        .where(and(eq(schema.scoreJobs.id, jobId), eq(schema.scoreJobs.lockToken, lockToken)))
        .returning();

      return record ? mapRecord(record) : readSingle(jobId);
    },
    async saveCompletedResult({
      attemptCount,
      jobId,
      lockToken,
      nowIso,
      resultPayload,
      statusMessage,
    }) {
      const [record] = await database
        .update(schema.scoreJobs)
        .set({
          activeKey: null,
          attemptCount,
          completedAt: nowIso,
          lockToken: null,
          lockedAt: null,
          nextAttemptAt: null,
          resultPayload,
          status: 'completed',
          statusMessage,
          updatedAt: nowIso,
        })
        .where(
          lockToken
            ? and(eq(schema.scoreJobs.id, jobId), eq(schema.scoreJobs.lockToken, lockToken))
            : eq(schema.scoreJobs.id, jobId)
        )
        .returning();

      return record ? mapRecord(record) : readSingle(jobId);
    },
    async markFailed({ attemptCount, jobId, lastErrorReason, lockToken, nowIso, statusMessage }) {
      const [record] = await database
        .update(schema.scoreJobs)
        .set({
          activeKey: null,
          attemptCount,
          completedAt: nowIso,
          lastErrorReason,
          lockToken: null,
          lockedAt: null,
          status: 'failed',
          statusMessage,
          updatedAt: nowIso,
        })
        .where(
          lockToken
            ? and(eq(schema.scoreJobs.id, jobId), eq(schema.scoreJobs.lockToken, lockToken))
            : eq(schema.scoreJobs.id, jobId)
        )
        .returning();

      return record ? mapRecord(record) : readSingle(jobId);
    },
  };
}
