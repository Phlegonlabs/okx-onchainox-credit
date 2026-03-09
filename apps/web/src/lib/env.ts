const DEFAULT_APP_URL = 'http://localhost:3000';
const DEFAULT_SESSION_EXPIRY_DAYS = 7;

export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL?.trim() || DEFAULT_APP_URL;
}

export function getSessionSecret(): string {
  const secret = process.env.SIWE_SESSION_SECRET?.trim();

  if (!secret || secret === 'placeholder') {
    throw new Error('SIWE_SESSION_SECRET must be configured');
  }

  return secret;
}

export function getSessionExpiryDays(): number {
  const rawValue = process.env.SIWE_SESSION_EXPIRY_DAYS?.trim();
  const parsedValue = Number(rawValue);

  if (!rawValue || Number.isNaN(parsedValue) || parsedValue <= 0) {
    return DEFAULT_SESSION_EXPIRY_DAYS;
  }

  return parsedValue;
}
