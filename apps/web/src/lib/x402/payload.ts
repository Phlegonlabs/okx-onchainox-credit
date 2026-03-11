import { parseUnits } from 'viem';

const PAYMENT_HEADER_ENCODING = 'base64';
const STABLECOIN_DECIMALS = 6;
const X402_VERSION = 1;

export interface X402Authorization {
  from: string;
  nonce: string;
  to: string;
  validAfter: string;
  validBefore: string;
  value: string;
}

export interface X402PaymentPayload {
  chainIndex: string;
  payload: {
    authorization: X402Authorization;
    signature: string;
  };
  scheme: 'exact';
  x402Version: number;
}

export interface X402PaymentRequirements {
  asset: string;
  chainIndex: string;
  extra: {
    decimals: number;
    domainName: string;
    domainVersion?: string;
    gasLimit: string;
    token: string;
  };
  maxAmountRequired: string;
  maxTimeoutSeconds: number;
  mimeType: string;
  payTo: string;
  resource: string;
  scheme: 'exact';
  x402Version: number;
}

export function buildPaymentRequirements(options: {
  amountUsd: string;
  chainId: number;
  domainName: string;
  domainVersion?: string;
  mimeType?: string;
  recipient: string;
  resource: string;
  token: string;
  tokenAddress: string;
}): X402PaymentRequirements {
  const chainIndex = String(options.chainId);
  const maxAmountRequired = parseUnits(options.amountUsd, STABLECOIN_DECIMALS).toString();

  return {
    asset: options.tokenAddress,
    chainIndex,
    extra: {
      decimals: STABLECOIN_DECIMALS,
      domainName: options.domainName,
      ...(options.domainVersion ? { domainVersion: options.domainVersion } : {}),
      gasLimit: '1000000',
      token: options.token,
    },
    maxAmountRequired,
    maxTimeoutSeconds: 600,
    mimeType: options.mimeType ?? 'application/json',
    payTo: options.recipient,
    resource: options.resource,
    scheme: 'exact',
    x402Version: X402_VERSION,
  };
}

export function buildPaymentAuthorization(options: {
  from: string;
  maxAmountRequired: string;
  payTo: string;
  validForSeconds: number;
}): X402Authorization {
  const nowSeconds = Math.floor(Date.now() / 1_000);
  const nonceBytes = new Uint8Array(32);
  crypto.getRandomValues(nonceBytes);
  const nonce = Array.from(nonceBytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

  return {
    from: options.from,
    nonce: `0x${nonce}`,
    to: options.payTo,
    validAfter: String(nowSeconds),
    validBefore: String(nowSeconds + options.validForSeconds),
    value: options.maxAmountRequired,
  };
}

export function buildTransferWithAuthorizationTypedData(options: {
  authorization: X402Authorization;
  chainId: number;
  domainName: string;
  domainVersion?: string;
  tokenAddress: string;
}) {
  return {
    domain: {
      name: options.domainName,
      ...(options.domainVersion ? { version: options.domainVersion } : {}),
      chainId: options.chainId,
      verifyingContract: options.tokenAddress,
    },
    message: options.authorization,
    primaryType: 'TransferWithAuthorization' as const,
    types: {
      EIP712Domain: [
        { name: 'name', type: 'string' },
        ...(options.domainVersion ? [{ name: 'version', type: 'string' as const }] : []),
        { name: 'chainId', type: 'uint256' },
        { name: 'verifyingContract', type: 'address' },
      ],
      TransferWithAuthorization: [
        { name: 'from', type: 'address' },
        { name: 'to', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'validAfter', type: 'uint256' },
        { name: 'validBefore', type: 'uint256' },
        { name: 'nonce', type: 'bytes32' },
      ],
    },
  };
}

export function buildPaymentPayload(options: {
  authorization: X402Authorization;
  chainId: number;
  signature: string;
}): X402PaymentPayload {
  return {
    chainIndex: String(options.chainId),
    payload: {
      authorization: options.authorization,
      signature: options.signature,
    },
    scheme: 'exact',
    x402Version: X402_VERSION,
  };
}

export function encodePaymentPayloadHeader(paymentPayload: X402PaymentPayload): string {
  const bytes = new TextEncoder().encode(JSON.stringify(paymentPayload));
  let binary = '';

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  if (typeof btoa === 'function') {
    return btoa(binary);
  }

  return Buffer.from(binary, 'binary').toString(PAYMENT_HEADER_ENCODING);
}

export function decodePaymentPayloadHeader(value: string): X402PaymentPayload | null {
  const normalized = value.trim();

  try {
    const binary =
      typeof atob === 'function'
        ? atob(normalized)
        : Buffer.from(normalized, PAYMENT_HEADER_ENCODING).toString('binary');
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));

    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    try {
      return JSON.parse(normalized);
    } catch {
      return null;
    }
  }
}

export function isX402PaymentPayload(value: unknown): value is X402PaymentPayload {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<X402PaymentPayload> & {
    payload?: Partial<X402PaymentPayload['payload']>;
  };

  return (
    candidate.scheme === 'exact' &&
    typeof candidate.x402Version === 'number' &&
    typeof candidate.chainIndex === 'string' &&
    !!candidate.payload &&
    typeof candidate.payload.signature === 'string' &&
    !!candidate.payload.authorization &&
    typeof candidate.payload.authorization.from === 'string' &&
    typeof candidate.payload.authorization.to === 'string' &&
    typeof candidate.payload.authorization.value === 'string' &&
    typeof candidate.payload.authorization.validAfter === 'string' &&
    typeof candidate.payload.authorization.validBefore === 'string' &&
    typeof candidate.payload.authorization.nonce === 'string'
  );
}

export function isX402PaymentRequirements(value: unknown): value is X402PaymentRequirements {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<X402PaymentRequirements> & {
    extra?: Partial<X402PaymentRequirements['extra']>;
  };

  return (
    candidate.scheme === 'exact' &&
    typeof candidate.x402Version === 'number' &&
    typeof candidate.asset === 'string' &&
    typeof candidate.chainIndex === 'string' &&
    typeof candidate.maxAmountRequired === 'string' &&
    typeof candidate.maxTimeoutSeconds === 'number' &&
    typeof candidate.mimeType === 'string' &&
    typeof candidate.payTo === 'string' &&
    typeof candidate.resource === 'string' &&
    !!candidate.extra &&
    typeof candidate.extra.decimals === 'number' &&
    typeof candidate.extra.domainName === 'string' &&
    typeof candidate.extra.gasLimit === 'string' &&
    typeof candidate.extra.token === 'string'
  );
}
