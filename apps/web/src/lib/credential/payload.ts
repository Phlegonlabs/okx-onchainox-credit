import type { Score } from '@okx-credit/scoring';
import { isAddress } from 'ethers';

const CREDENTIAL_EXPIRY_DAYS = 30;
const CREDENTIAL_EXPIRY_SECONDS = CREDENTIAL_EXPIRY_DAYS * 24 * 60 * 60;
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

export function createCredentialPayload(
  wallet: string,
  score: Pick<Score, 'dimensions' | 'score' | 'tier'>,
  issuedAt = new Date()
): CredentialPayload {
  const issuedAtSeconds = Math.floor(issuedAt.getTime() / 1_000);

  return {
    dimensions: score.dimensions,
    expiresAt: issuedAtSeconds + CREDENTIAL_EXPIRY_SECONDS,
    issuedAt: issuedAtSeconds,
    issuer: CREDENTIAL_ISSUER,
    score: score.score,
    tier: score.tier,
    version: CREDENTIAL_VERSION,
    wallet,
  };
}

export function isCredentialPayload(value: unknown): value is CredentialPayload {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const payload = value as Partial<CredentialPayload>;

  return (
    payload.version === CREDENTIAL_VERSION &&
    payload.issuer === CREDENTIAL_ISSUER &&
    typeof payload.wallet === 'string' &&
    isAddress(payload.wallet) &&
    typeof payload.score === 'number' &&
    Number.isInteger(payload.score) &&
    typeof payload.issuedAt === 'number' &&
    typeof payload.expiresAt === 'number' &&
    payload.expiresAt - payload.issuedAt === CREDENTIAL_EXPIRY_SECONDS &&
    payload.tier !== undefined &&
    payload.dimensions !== undefined
  );
}
