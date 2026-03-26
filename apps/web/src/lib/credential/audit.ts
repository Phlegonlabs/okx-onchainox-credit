import { db, schema } from '@/lib/db';
import type { ScoreTier } from '@graxis/scoring';

export interface CredentialAuditRecord {
  expiresAt: number;
  issuedAt: number;
  payer: string | null;
  scoreTier: ScoreTier;
  walletHash: string;
  x402Tx: string | null;
}

export async function logCredentialIssuance(
  record: CredentialAuditRecord,
  database: typeof db = db
): Promise<void> {
  await database.insert(schema.auditLog).values({
    action: 'credential_issued',
    createdAt: new Date().toISOString(),
    metadata: {
      expiresAt: record.expiresAt,
      issuedAt: record.issuedAt,
      version: '1.0',
    },
    payer: record.payer,
    scoreTier: record.scoreTier,
    walletHash: record.walletHash,
    x402Tx: record.x402Tx,
  });
}
