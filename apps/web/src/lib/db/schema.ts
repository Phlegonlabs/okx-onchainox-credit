import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const creditScores = sqliteTable(
  'credit_scores',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    walletHash: text('wallet_hash').notNull(),
    score: integer('score').notNull(),
    scoreTier: text('score_tier').notNull(),
    dimensions: text('dimensions', { mode: 'json' }).notNull(),
    dataSource: text('data_source').notNull().default('okx_onchainos_v1'),
    stale: integer('stale', { mode: 'boolean' }).notNull().default(false),
    computedAt: text('computed_at').notNull(),
    expiresAt: text('expires_at').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => ({
    walletHashIdx: uniqueIndex('credit_scores_wallet_hash_idx').on(table.walletHash),
    expiresAtIdx: index('credit_scores_expires_at_idx').on(table.expiresAt),
  })
);

export const auditLog = sqliteTable(
  'audit_log',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    action: text('action').notNull(),
    walletHash: text('wallet_hash').notNull(),
    scoreTier: text('score_tier').notNull(),
    payer: text('payer'),
    x402Tx: text('x402_tx'),
    metadata: text('metadata', { mode: 'json' }),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    actionIdx: index('audit_log_action_idx').on(table.action),
    walletHashIdx: index('audit_log_wallet_hash_idx').on(table.walletHash),
    createdAtIdx: index('audit_log_created_at_idx').on(table.createdAt),
  })
);

export const apiRateLimits = sqliteTable(
  'api_rate_limits',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    payer: text('payer').notNull(),
    resource: text('resource').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    payerCreatedAtIdx: index('api_rate_limits_payer_created_at_idx').on(
      table.payer,
      table.createdAt
    ),
    createdAtIdx: index('api_rate_limits_created_at_idx').on(table.createdAt),
  })
);

export const scoreJobs = sqliteTable(
  'score_jobs',
  {
    id: text('id').primaryKey(),
    walletHash: text('wallet_hash').notNull(),
    payer: text('payer').notNull(),
    activeKey: text('active_key'),
    status: text('status').notNull(),
    statusMessage: text('status_message'),
    attemptCount: integer('attempt_count').notNull().default(0),
    nextAttemptAt: text('next_attempt_at'),
    lockToken: text('lock_token'),
    lockedAt: text('locked_at'),
    x402Tx: text('x402_tx'),
    lastErrorReason: text('last_error_reason'),
    resultPayload: text('result_payload', { mode: 'json' }),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    completedAt: text('completed_at'),
  },
  (table) => ({
    activeKeyIdx: uniqueIndex('score_jobs_active_key_idx').on(table.activeKey),
    createdAtIdx: index('score_jobs_created_at_idx').on(table.createdAt),
    statusIdx: index('score_jobs_status_idx').on(table.status),
    walletHashIdx: index('score_jobs_wallet_hash_idx').on(table.walletHash),
  })
);

export const siweNonceUses = sqliteTable(
  'siwe_nonce_uses',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    nonceHash: text('nonce_hash').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    nonceHashIdx: uniqueIndex('siwe_nonce_uses_nonce_hash_idx').on(table.nonceHash),
    createdAtIdx: index('siwe_nonce_uses_created_at_idx').on(table.createdAt),
  })
);

export const schema = {
  apiRateLimits,
  auditLog,
  creditScores,
  scoreJobs,
  siweNonceUses,
};
