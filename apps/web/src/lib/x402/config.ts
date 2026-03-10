import { isAddress } from 'ethers';

const DEFAULT_CHAIN_ID = 196;
const DEFAULT_CREDENTIAL_PRICE_USD = '0.50';
const DEFAULT_NETWORK = 'xlayer';
const DEFAULT_SCORE_QUERY_PRICE_USD = '0.10';

const TOKEN_ADDRESS_ENV: Record<X402TokenSymbol, string> = {
  USDC: 'X402_USDC_ADDRESS',
  USDG: 'X402_USDG_ADDRESS',
  USDT: 'X402_USDT_ADDRESS',
};

export type X402TokenSymbol = 'USDC' | 'USDG' | 'USDT';

export interface X402Config {
  chainId: number;
  network: string;
  recipient: string;
  token: X402TokenSymbol;
  tokenAddress: string;
}

function assertNonEmptyValue(value: string | undefined, envName: string): string {
  const normalized = value?.trim();

  if (!normalized || normalized === 'placeholder') {
    throw new Error(`${envName} must be configured`);
  }

  return normalized;
}

function parsePositiveAmount(value: string | undefined, envName: string, fallback: string): string {
  const raw = value?.trim() || fallback;
  const parsed = Number(raw);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${envName} must be a positive number`);
  }

  return parsed.toFixed(2);
}

function readToken(): X402TokenSymbol {
  const rawToken = (process.env.X402_PAYMENT_TOKEN?.trim().toUpperCase() ||
    'USDC') as X402TokenSymbol;

  if (!(rawToken in TOKEN_ADDRESS_ENV)) {
    throw new Error('X402_PAYMENT_TOKEN must be one of USDG, USDT, or USDC');
  }

  return rawToken;
}

export function getCredentialPriceUsd(): string {
  return parsePositiveAmount(
    process.env.X402_CREDENTIAL_PRICE_USD,
    'X402_CREDENTIAL_PRICE_USD',
    DEFAULT_CREDENTIAL_PRICE_USD
  );
}

export function getScoreQueryPriceUsd(): string {
  return parsePositiveAmount(
    process.env.X402_SCORE_QUERY_PRICE_USD,
    'X402_SCORE_QUERY_PRICE_USD',
    DEFAULT_SCORE_QUERY_PRICE_USD
  );
}

export function getX402Config(): X402Config {
  const token = readToken();
  const recipient = assertNonEmptyValue(
    process.env.X402_RECIPIENT_ADDRESS,
    'X402_RECIPIENT_ADDRESS'
  );
  const tokenAddress = assertNonEmptyValue(
    process.env[TOKEN_ADDRESS_ENV[token]],
    TOKEN_ADDRESS_ENV[token]
  );
  const network = process.env.X402_NETWORK?.trim() || DEFAULT_NETWORK;
  const rawChainId = process.env.X402_CHAIN_ID?.trim();
  const chainId = rawChainId ? Number(rawChainId) : DEFAULT_CHAIN_ID;

  if (!Number.isInteger(chainId) || chainId <= 0) {
    throw new Error('X402_CHAIN_ID must be a positive integer');
  }

  if (!isAddress(recipient)) {
    throw new Error('X402_RECIPIENT_ADDRESS must be a valid EVM address');
  }

  if (!isAddress(tokenAddress)) {
    throw new Error(`${TOKEN_ADDRESS_ENV[token]} must be a valid EVM address`);
  }

  return {
    chainId,
    network,
    recipient,
    token,
    tokenAddress,
  };
}
