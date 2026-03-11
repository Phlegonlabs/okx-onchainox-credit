import { Wallet, isAddress } from 'ethers';

const PLACEHOLDER_VALUE = 'placeholder';
const TOKEN_ADDRESS_ENV_BY_SYMBOL = {
  USDC: 'X402_USDC_ADDRESS',
  USDG: 'X402_USDG_ADDRESS',
  USDT: 'X402_USDT_ADDRESS',
  USDT0: 'X402_USDT0_ADDRESS',
} as const;

const RELEASE_REQUIRED_ENV_VARS = [
  'OKX_API_KEY',
  'OKX_SECRET_KEY',
  'OKX_PASSPHRASE',
  'ECDSA_PRIVATE_KEY',
  'ECDSA_PUBLIC_ADDRESS',
  'X402_NETWORK',
  'X402_CHAIN_ID',
  'X402_PAYMENT_TOKEN',
  'X402_RECIPIENT_ADDRESS',
  'X402_CREDENTIAL_PRICE_USD',
  'X402_SCORE_QUERY_PRICE_USD',
  'TURSO_DATABASE_URL',
  'TURSO_AUTH_TOKEN',
  'SIWE_SESSION_SECRET',
  'NEXT_PUBLIC_APP_URL',
  'NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID',
] as const;

export type ReleaseEnvironmentTarget = 'preview' | 'production';

export interface ReleaseEnvIssue {
  envName?: string;
  message: string;
}

export interface ReleaseEnvReport {
  errors: ReleaseEnvIssue[];
  summary: {
    appUrl: string | null;
    databaseUrl: string | null;
    localIntegrationMode: string | null;
    paymentToken: string | null;
    target: ReleaseEnvironmentTarget;
  };
  warnings: ReleaseEnvIssue[];
}

function readConfiguredValue(env: NodeJS.ProcessEnv, envName: string): string | null {
  const value = env[envName]?.trim();

  if (!value || value === PLACEHOLDER_VALUE) {
    return null;
  }

  return value;
}

function pushError(errors: ReleaseEnvIssue[], envName: string, message: string): void {
  errors.push({ envName, message });
}

function pushWarning(warnings: ReleaseEnvIssue[], envName: string, message: string): void {
  warnings.push({ envName, message });
}

function validateAbsoluteOrigin(
  value: string,
  envName: string,
  errors: ReleaseEnvIssue[]
): URL | null {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(value);
  } catch {
    pushError(errors, envName, `${envName} must be a valid absolute URL`);
    return null;
  }

  if (parsedUrl.pathname !== '/' || parsedUrl.search || parsedUrl.hash) {
    pushError(errors, envName, `${envName} must be an origin without path, query, or hash`);
    return null;
  }

  return parsedUrl;
}

function validatePositiveNumber(
  value: string,
  envName: string,
  errors: ReleaseEnvIssue[]
): number | null {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    pushError(errors, envName, `${envName} must be a positive number`);
    return null;
  }

  return parsedValue;
}

function validatePositiveInteger(
  value: string,
  envName: string,
  errors: ReleaseEnvIssue[]
): number | null {
  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    pushError(errors, envName, `${envName} must be a positive integer`);
    return null;
  }

  return parsedValue;
}

function validateAddress(value: string, envName: string, errors: ReleaseEnvIssue[]): void {
  if (!isAddress(value)) {
    pushError(errors, envName, `${envName} must be a valid EVM address`);
  }
}

function validateCredentialSigner(env: NodeJS.ProcessEnv, errors: ReleaseEnvIssue[]): void {
  const privateKey = readConfiguredValue(env, 'ECDSA_PRIVATE_KEY');
  const publicAddress = readConfiguredValue(env, 'ECDSA_PUBLIC_ADDRESS');

  if (!privateKey || !publicAddress) {
    return;
  }

  try {
    const wallet = new Wallet(privateKey);

    if (wallet.address.toLowerCase() !== publicAddress.toLowerCase()) {
      pushError(
        errors,
        'ECDSA_PUBLIC_ADDRESS',
        'ECDSA_PUBLIC_ADDRESS does not match ECDSA_PRIVATE_KEY'
      );
    }
  } catch {
    pushError(
      errors,
      'ECDSA_PRIVATE_KEY',
      'ECDSA_PRIVATE_KEY must be a valid secp256k1 private key'
    );
  }
}

function validatePaymentToken(env: NodeJS.ProcessEnv, errors: ReleaseEnvIssue[]): string | null {
  const paymentToken = readConfiguredValue(env, 'X402_PAYMENT_TOKEN')?.toUpperCase();

  if (!paymentToken) {
    return null;
  }

  if (!(paymentToken in TOKEN_ADDRESS_ENV_BY_SYMBOL)) {
    pushError(
      errors,
      'X402_PAYMENT_TOKEN',
      'X402_PAYMENT_TOKEN must be one of USDG, USDT, USDT0, or USDC'
    );
    return paymentToken;
  }

  const tokenAddressEnv =
    TOKEN_ADDRESS_ENV_BY_SYMBOL[paymentToken as keyof typeof TOKEN_ADDRESS_ENV_BY_SYMBOL];
  const tokenAddress = readConfiguredValue(env, tokenAddressEnv);

  if (!tokenAddress) {
    pushError(errors, tokenAddressEnv, `${tokenAddressEnv} must be configured`);
    return paymentToken;
  }

  validateAddress(tokenAddress, tokenAddressEnv, errors);
  return paymentToken;
}

export function getReleaseEnvReport(
  env: NodeJS.ProcessEnv,
  target: ReleaseEnvironmentTarget
): ReleaseEnvReport {
  const errors: ReleaseEnvIssue[] = [];
  const warnings: ReleaseEnvIssue[] = [];

  for (const envName of RELEASE_REQUIRED_ENV_VARS) {
    if (!readConfiguredValue(env, envName)) {
      pushError(errors, envName, `${envName} must be configured for ${target}`);
    }
  }

  const appUrl = readConfiguredValue(env, 'NEXT_PUBLIC_APP_URL');
  const databaseUrl = readConfiguredValue(env, 'TURSO_DATABASE_URL');
  const localIntegrationMode = env.LOCAL_INTEGRATION_MODE?.trim().toLowerCase() || null;
  const paymentToken = validatePaymentToken(env, errors);

  if (appUrl) {
    const parsedUrl = validateAbsoluteOrigin(appUrl, 'NEXT_PUBLIC_APP_URL', errors);

    if (parsedUrl) {
      if (parsedUrl.protocol !== 'https:') {
        pushError(errors, 'NEXT_PUBLIC_APP_URL', 'NEXT_PUBLIC_APP_URL must use https');
      }

      if (parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1') {
        pushError(
          errors,
          'NEXT_PUBLIC_APP_URL',
          'NEXT_PUBLIC_APP_URL must not point to localhost for release targets'
        );
      }
    }
  }

  if (databaseUrl) {
    if (databaseUrl.startsWith('file:')) {
      pushError(
        errors,
        'TURSO_DATABASE_URL',
        'TURSO_DATABASE_URL must point to a remote Turso database for release targets'
      );
    }
  }

  const okxBaseUrl = readConfiguredValue(env, 'OKX_BASE_URL');
  if (okxBaseUrl) {
    const parsedOkxBaseUrl = validateAbsoluteOrigin(okxBaseUrl, 'OKX_BASE_URL', errors);

    if (parsedOkxBaseUrl && parsedOkxBaseUrl.protocol !== 'https:') {
      pushError(errors, 'OKX_BASE_URL', 'OKX_BASE_URL must use https');
    }
  } else {
    pushWarning(
      warnings,
      'OKX_BASE_URL',
      'OKX_BASE_URL is unset; release will use the default https://web3.okx.com endpoint'
    );
  }

  const sessionExpiryDays = readConfiguredValue(env, 'SIWE_SESSION_EXPIRY_DAYS');
  if (sessionExpiryDays) {
    validatePositiveInteger(sessionExpiryDays, 'SIWE_SESSION_EXPIRY_DAYS', errors);
  } else {
    pushWarning(
      warnings,
      'SIWE_SESSION_EXPIRY_DAYS',
      'SIWE_SESSION_EXPIRY_DAYS is unset; release will use the default 7-day session expiry'
    );
  }

  const x402ChainId = readConfiguredValue(env, 'X402_CHAIN_ID');
  const x402Network = readConfiguredValue(env, 'X402_NETWORK');
  const x402RecipientAddress = readConfiguredValue(env, 'X402_RECIPIENT_ADDRESS');

  if (x402ChainId) {
    const parsedChainId = validatePositiveInteger(x402ChainId, 'X402_CHAIN_ID', errors);

    if (parsedChainId !== null && parsedChainId !== 196) {
      pushWarning(
        warnings,
        'X402_CHAIN_ID',
        'X402_CHAIN_ID is not 196; confirm the launch scope still targets X Layer'
      );
    }
  }

  if (x402Network && x402Network.toLowerCase() !== 'xlayer') {
    pushWarning(
      warnings,
      'X402_NETWORK',
      'X402_NETWORK is not xlayer; confirm the launch scope still targets X Layer'
    );
  }

  if (x402RecipientAddress) {
    validateAddress(x402RecipientAddress, 'X402_RECIPIENT_ADDRESS', errors);
  }

  const credentialPrice = readConfiguredValue(env, 'X402_CREDENTIAL_PRICE_USD');
  if (credentialPrice) {
    validatePositiveNumber(credentialPrice, 'X402_CREDENTIAL_PRICE_USD', errors);
  }

  const scoreQueryPrice = readConfiguredValue(env, 'X402_SCORE_QUERY_PRICE_USD');
  if (scoreQueryPrice) {
    validatePositiveNumber(scoreQueryPrice, 'X402_SCORE_QUERY_PRICE_USD', errors);
  }

  const credentialPublicAddress = readConfiguredValue(env, 'ECDSA_PUBLIC_ADDRESS');
  if (credentialPublicAddress) {
    validateAddress(credentialPublicAddress, 'ECDSA_PUBLIC_ADDRESS', errors);
  }

  validateCredentialSigner(env, errors);

  if (localIntegrationMode === 'mock') {
    pushError(
      errors,
      'LOCAL_INTEGRATION_MODE',
      'LOCAL_INTEGRATION_MODE=mock is not allowed for preview or production releases'
    );
  }

  return {
    errors,
    summary: {
      appUrl,
      databaseUrl,
      localIntegrationMode,
      paymentToken,
      target,
    },
    warnings,
  };
}
