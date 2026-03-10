import { ValidationError } from '@/lib/errors';
import { type IssuedCredential, isCredentialPayload } from './payload';

export function parseCredentialQueryValue(value: string | null): IssuedCredential {
  if (!value) {
    throw new ValidationError('A credential query parameter is required.');
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(value);
  } catch {
    throw new ValidationError('Credential query parameter must be valid JSON.');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new ValidationError('Credential payload must be a JSON object.');
  }

  const candidate = parsed as Partial<IssuedCredential>;

  if (typeof candidate.signature !== 'string' || candidate.signature.length === 0) {
    throw new ValidationError('Credential signature is required.');
  }

  const { signature, ...payload } = candidate;

  if (!isCredentialPayload(payload)) {
    throw new ValidationError('Credential payload is invalid.');
  }

  return {
    ...payload,
    signature,
  };
}
