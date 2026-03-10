import { db, schema } from '@/lib/db';
import type { ScoreTier } from '@okx-credit/scoring';

type EnterpriseAuditMetadataValue = boolean | null | number | string;

export interface EnterpriseApiAuditRecord {
  metadata?: Record<string, EnterpriseAuditMetadataValue>;
  payer: string | null;
  resource: 'credential_verification' | 'score_query';
  scoreTier: ScoreTier;
  walletHash: string;
  x402Tx: string | null;
}

export async function logEnterpriseApiQuery(
  record: EnterpriseApiAuditRecord,
  database: typeof db = db
): Promise<void> {
  await database.insert(schema.auditLog).values({
    action: 'api_query',
    createdAt: new Date().toISOString(),
    metadata: {
      resource: record.resource,
      ...record.metadata,
    },
    payer: record.payer,
    scoreTier: record.scoreTier,
    walletHash: record.walletHash,
    x402Tx: record.x402Tx,
  });
}
