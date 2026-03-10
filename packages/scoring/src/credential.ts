import { getAddress, isAddress, verifyMessage } from 'ethers';
import type { Score } from './types.js';

const CREDENTIAL_EXPIRY_DAYS = 30;
const CREDENTIAL_EXPIRY_SECONDS = CREDENTIAL_EXPIRY_DAYS * 24 * 60 * 60;
const CREDENTIAL_ISSUER = 'okx-onchainos-credit';
const CREDENTIAL_VERSION = '1.0';

type SerializableValue =
  | boolean
  | null
  | number
  | string
  | SerializableValue[]
  | { [key: string]: SerializableValue };

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

function normalizeValue(value: unknown): SerializableValue {
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeValue(entry));
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, SerializableValue>;

    return Object.keys(value)
      .sort()
      .reduce<Record<string, SerializableValue>>((result, key) => {
        const entry = record[key];
        if (entry !== undefined) {
          result[key] = normalizeValue(entry);
        }
        return result;
      }, {});
  }

  if (
    value === null ||
    typeof value === 'boolean' ||
    typeof value === 'number' ||
    typeof value === 'string'
  ) {
    return value;
  }

  throw new TypeError('Credential payload contains unsupported value types');
}

export function serializeCredentialPayload(payload: unknown): string {
  return JSON.stringify(normalizeValue(payload));
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

export function parseIssuedCredential(value: string): IssuedCredential {
  let parsed: unknown;

  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error('Credential file must contain valid JSON.');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Credential file must contain a JSON object.');
  }

  const candidate = parsed as Partial<IssuedCredential>;

  if (typeof candidate.signature !== 'string' || candidate.signature.length === 0) {
    throw new Error('Credential signature is required.');
  }

  const { signature, ...payload } = candidate;

  if (!isCredentialPayload(payload)) {
    throw new Error('Credential payload is invalid.');
  }

  return {
    ...payload,
    signature,
  };
}

export function getCredentialPublicAddress(): string {
  const address = process.env.ECDSA_PUBLIC_ADDRESS?.trim();

  if (!address || address === 'placeholder') {
    throw new Error('ECDSA_PUBLIC_ADDRESS must be configured');
  }

  if (!isAddress(address)) {
    throw new Error('ECDSA_PUBLIC_ADDRESS must be a valid EVM address');
  }

  return address;
}

export async function verifyCredentialSignature(
  payload: CredentialPayload,
  signature: string,
  expectedAddress = getCredentialPublicAddress()
): Promise<boolean> {
  const recoveredAddress = verifyMessage(serializeCredentialPayload(payload), signature);

  return getAddress(recoveredAddress) === getAddress(expectedAddress);
}
