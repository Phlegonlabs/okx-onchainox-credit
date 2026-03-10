import { createHmac, timingSafeEqual } from 'node:crypto';
import { getSessionExpiryDays, getSessionSecret } from './env';

export const SESSION_COOKIE_NAME = 'okx_credit_session';

export interface SessionPayload {
  expiresAt: string;
  wallet: string;
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

export function createSessionToken(wallet: string): { expiresAt: string; token: string } {
  const expiresAt = new Date(
    Date.now() + getSessionExpiryDays() * 24 * 60 * 60 * 1000
  ).toISOString();
  const payload = JSON.stringify({ wallet, expiresAt } satisfies SessionPayload);
  const encodedPayload = Buffer.from(payload, 'utf-8').toString('base64url');
  const signature = sign(encodedPayload);

  return {
    token: `${encodedPayload}.${signature}`,
    expiresAt,
  };
}

export function verifySessionToken(token: string): SessionPayload | null {
  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = sign(encodedPayload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  let payload: SessionPayload;
  try {
    payload = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf-8')
    ) as SessionPayload;
  } catch {
    return null;
  }
  if (!payload.wallet || !payload.expiresAt) {
    return null;
  }

  if (new Date(payload.expiresAt).getTime() <= Date.now()) {
    return null;
  }

  return payload;
}

export function getSessionFromCookieHeader(cookieHeader: string | null): SessionPayload | null {
  const cookies = parseCookieHeader(cookieHeader);
  const token = cookies[SESSION_COOKIE_NAME];

  return token ? verifySessionToken(token) : null;
}
