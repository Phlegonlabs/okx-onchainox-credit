const DEFAULT_APP_URL = 'http://localhost:3000';
const DEFAULT_SESSION_EXPIRY_DAYS = 7;
const PLACEHOLDER_VALUE = 'placeholder';

function normalizeConfiguredValue(value: string | undefined): string | null {
  const normalized = value?.trim();

  if (!normalized || normalized === PLACEHOLDER_VALUE) {
    return null;
  }

  return normalized;
}

export function getAppUrl(): string {
  const configuredUrl = normalizeConfiguredValue(process.env.NEXT_PUBLIC_APP_URL);
  const isProduction = process.env.NODE_ENV === 'production';

  if (!configuredUrl) {
    if (isProduction) {
      throw new Error('NEXT_PUBLIC_APP_URL must be configured in production');
    }

    return DEFAULT_APP_URL;
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(configuredUrl);
  } catch {
    throw new Error('NEXT_PUBLIC_APP_URL must be a valid absolute URL');
  }

  if (parsedUrl.pathname !== '/' || parsedUrl.search || parsedUrl.hash) {
    throw new Error('NEXT_PUBLIC_APP_URL must be an origin without path, query, or hash');
  }

  if (isProduction && parsedUrl.protocol !== 'https:') {
    throw new Error('NEXT_PUBLIC_APP_URL must use https in production');
  }

  return parsedUrl.origin;
}

export function getSessionSecret(): string {
  const secret = normalizeConfiguredValue(process.env.SIWE_SESSION_SECRET);

  if (!secret) {
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
