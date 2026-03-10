import type { Score } from '@okx-credit/scoring';

const CREDENTIAL_EXPIRY_DAYS = 30;
const CREDENTIAL_ISSUER = 'okx-onchainos-credit';
const CREDENTIAL_VERSION = '1.0';

export interface CredentialPayload {
  dimensions: Score['dimensions'];
  expiresAt: number;
  issuedAt: number;
  issuer: typeof CREDENTIAL_ISSUER;
  score: number;
  tier: Score['tier'];
  version: typeof CREDENTIAL_VERSION;
  wallet: string;
}

export interface IssuedCredential extends CredentialPayload {
  signature: string;
}

export function createCredentialPayload(score: Score, issuedAt = new Date()): CredentialPayload {
  const issuedAtSeconds = Math.floor(issuedAt.getTime() / 1_000);

  return {
    dimensions: score.dimensions,
    expiresAt: issuedAtSeconds + CREDENTIAL_EXPIRY_DAYS * 24 * 60 * 60,
    issuedAt: issuedAtSeconds,
    issuer: CREDENTIAL_ISSUER,
    score: score.score,
    tier: score.tier,
    version: CREDENTIAL_VERSION,
    wallet: score.wallet,
  };
}
