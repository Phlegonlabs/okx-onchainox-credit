import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { getSessionSecret } from '@/lib/env';

export const SIWE_NONCE_COOKIE_NAME = 'graxis_siwe_nonce';

const SIWE_NONCE_BYTE_LENGTH = 16;
const SIWE_NONCE_TTL_MS = 5 * 60 * 1000;

interface SiweNonceChallengePayload {
  expiresAt: string;
  nonce: string;
}

function sign(value: string): string {
  return createHmac('sha256', getSessionSecret()).update(value).digest('base64url');
}

function parseCookieHeader(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) {
    return {};
  }

  return cookieHeader.split(';').reduce<Record<string, string>>((cookies, entry) => {
    const [rawName, ...rawValue] = entry.trim().split('=');
    if (!rawName || rawValue.length === 0) {
      return cookies;
    }

    cookies[rawName] = decodeURIComponent(rawValue.join('='));
    return cookies;
  }, {});
}

function decodePayload(encodedPayload: string): SiweNonceChallengePayload | null {
  try {
    return JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf-8')
    ) as SiweNonceChallengePayload;
  } catch {
    return null;
  }
}

function isMatchingNonce(expectedNonce: string, actualNonce: string): boolean {
  const expectedBuffer = Buffer.from(expectedNonce, 'utf-8');
  const actualBuffer = Buffer.from(actualNonce, 'utf-8');

  return (
    expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer)
  );
}

export function createSiweNonceChallenge(now = new Date()): {
  expiresAt: string;
  nonce: string;
  token: string;
} {
  const nonce = randomBytes(SIWE_NONCE_BYTE_LENGTH).toString('hex');
  const expiresAt = new Date(now.getTime() + SIWE_NONCE_TTL_MS).toISOString();
  const payload = JSON.stringify({ expiresAt, nonce } satisfies SiweNonceChallengePayload);
  const encodedPayload = Buffer.from(payload, 'utf-8').toString('base64url');
  const signature = sign(encodedPayload);

  return {
    expiresAt,
    nonce,
    token: `${encodedPayload}.${signature}`,
  };
}

export function verifySiweNonceChallenge(
  cookieHeader: string | null,
  expectedNonce: string,
  now = new Date()
): boolean {
  const token = parseCookieHeader(cookieHeader)[SIWE_NONCE_COOKIE_NAME];
  if (!token) {
    return false;
  }

  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) {
    return false;
  }

  const expectedSignature = sign(encodedPayload);
  const signatureBuffer = Buffer.from(signature, 'utf-8');
  const expectedBuffer = Buffer.from(expectedSignature, 'utf-8');

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return false;
  }

  const payload = decodePayload(encodedPayload);
  if (!payload?.nonce || !payload.expiresAt) {
    return false;
  }

  if (new Date(payload.expiresAt).getTime() <= now.getTime()) {
    return false;
  }

  return isMatchingNonce(expectedNonce, payload.nonce);
}
