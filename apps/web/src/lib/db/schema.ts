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

export const schema = {
  auditLog,
  creditScores,
};
