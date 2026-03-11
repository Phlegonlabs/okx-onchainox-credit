import { PaymentRequiredError, PaymentVerificationError, toErrorBody } from '@/lib/errors';
import {
  LOCAL_MOCK_PAYMENT_RECEIPT,
  createLocalMockPaymentSettlement,
  isLocalMockMode,
} from '@/lib/local-integration';
import { NextResponse } from 'next/server';
import {
  OkxX402Client,
  type X402Client,
  type X402PaymentSettlement,
  type X402PaymentVerification,
} from './client';
import { type X402Config, getCredentialPriceUsd, getX402Config } from './config';
import {
  type X402PaymentPayload,
  type X402PaymentRequirements,
  buildPaymentRequirements,
  decodePaymentPayloadHeader,
} from './payload';
import { getX402TokenDomainMetadata } from './token-metadata';

const PAYMENT_SIGNATURE_HEADER = 'payment-signature';

interface SharedX402PaymentRequest {
  amountUsd?: string;
  client?: X402Client;
  config?: X402Config;
  resource?: string;
}

export type X402PaymentVerificationResult =
  | { ok: true; payment: X402PaymentVerification }
  | { ok: false; response: NextResponse };

export type X402PaymentSettlementResult =
  | { ok: true; payment: X402PaymentSettlement }
  | { ok: false; response: NextResponse };

function buildPaymentRequiredDetails(
  config: X402Config,
  amountUsd: string,
  resource: string,
  resourceUrl: string
): {
  amount: string;
  chainId: number;
  header: string;
  localMockReceipt?: string;
  network: string;
  paymentRequirements: X402PaymentRequirements;
  recipient: string;
  resource: string;
  token: string;
  tokenAddress: string;
} {
  const tokenMetadata = getX402TokenDomainMetadata(config.token);
  const paymentRequirements = buildPaymentRequirements({
    amountUsd,
    chainId: config.chainId,
    domainName: tokenMetadata.domainName,
    ...(tokenMetadata.domainVersion ? { domainVersion: tokenMetadata.domainVersion } : {}),
    recipient: config.recipient,
    resource: resourceUrl,
    token: config.token,
    tokenAddress: config.tokenAddress,
  });

  return {
    amount: amountUsd,
    chainId: config.chainId,
    header: 'Payment-Signature',
    ...(isLocalMockMode() ? { localMockReceipt: LOCAL_MOCK_PAYMENT_RECEIPT } : {}),
    network: config.network,
    paymentRequirements,
    recipient: config.recipient,
    resource,
    token: config.token,
    tokenAddress: config.tokenAddress,
  };
}

function createPaymentRequiredResponse(
  error: PaymentRequiredError | PaymentVerificationError,
  config: X402Config,
  amountUsd: string,
  resource: string,
  resourceUrl: string
): NextResponse {
  return NextResponse.json(
    {
      ...toErrorBody(error),
      paymentRequired: buildPaymentRequiredDetails(config, amountUsd, resource, resourceUrl),
    },
    { status: 402 }
  );
}

function getPaymentContext(options: SharedX402PaymentRequest) {
  return {
    amountUsd: options.amountUsd ?? getCredentialPriceUsd(),
    client: options.client,
    config: options.config ?? getX402Config(),
    resource: options.resource ?? 'credential_issuance',
  };
}

function createLocalMockPaymentVerification(
  paymentPayload: X402PaymentPayload,
  paymentRequirements: X402PaymentRequirements
): X402PaymentVerification {
  const settlement = createLocalMockPaymentSettlement(LOCAL_MOCK_PAYMENT_RECEIPT);

  return {
    invalidReason: null,
    isValid: true,
    payer: settlement.payer,
    paymentPayload,
    paymentRequirements,
    raw: {
      local: true,
      receipt: LOCAL_MOCK_PAYMENT_RECEIPT,
    },
    txHash: settlement.txHash,
  };
}

function createLocalMockPaymentPayload(
  config: X402Config,
  paymentRequirements: X402PaymentRequirements
): X402PaymentPayload {
  return {
    chainIndex: String(config.chainId),
    payload: {
      authorization: {
        from: createLocalMockPaymentSettlement().payer ?? '0xlocalpayer',
        nonce: `0x${'0'.repeat(64)}`,
        to: paymentRequirements.payTo,
        validAfter: '0',
        validBefore: String(Math.floor(Date.now() / 1_000) + paymentRequirements.maxTimeoutSeconds),
        value: paymentRequirements.maxAmountRequired,
      },
      signature: '0xlocalmocksignature',
    },
    scheme: 'exact',
    x402Version: 1,
  };
}

function parsePaymentPayload(receiptHeader: string | null): X402PaymentPayload | null {
  if (!receiptHeader) {
    return null;
  }

  return decodePaymentPayloadHeader(receiptHeader);
}

export async function verifyX402Payment(
  request: Request,
  options: SharedX402PaymentRequest = {}
): Promise<X402PaymentVerificationResult> {
  const { amountUsd, client, config, resource } = getPaymentContext(options);
  const resourceUrl = request.url;
  const paymentRequirements = buildPaymentRequiredDetails(
    config,
    amountUsd,
    resource,
    resourceUrl
  ).paymentRequirements;
  const receiptHeader = request.headers.get(PAYMENT_SIGNATURE_HEADER)?.trim() ?? null;
  const paymentPayload = parsePaymentPayload(receiptHeader);

  if (!receiptHeader) {
    return {
      ok: false,
      response: createPaymentRequiredResponse(
        new PaymentRequiredError('x402 payment required for this resource'),
        config,
        amountUsd,
        resource,
        resourceUrl
      ),
    };
  }

  if (isLocalMockMode()) {
    if (receiptHeader === LOCAL_MOCK_PAYMENT_RECEIPT) {
      const mockPayload =
        paymentPayload ?? createLocalMockPaymentPayload(config, paymentRequirements);
      return {
        ok: true,
        payment: createLocalMockPaymentVerification(mockPayload, paymentRequirements),
      };
    }

    return {
      ok: false,
      response: createPaymentRequiredResponse(
        new PaymentVerificationError('Provided x402 payment could not be verified', {
          reason: 'local_mock_receipt_mismatch',
        }),
        config,
        amountUsd,
        resource,
        resourceUrl
      ),
    };
  }

  if (!paymentPayload) {
    return {
      ok: false,
      response: createPaymentRequiredResponse(
        new PaymentVerificationError('Provided x402 payment could not be decoded', {
          reason: 'invalid_payment_payload',
        }),
        config,
        amountUsd,
        resource,
        resourceUrl
      ),
    };
  }

  try {
    const activeClient = client ?? OkxX402Client.fromEnv();
    const payment = await activeClient.verifyPayment(paymentPayload, paymentRequirements);

    if (!payment.isValid) {
      return {
        ok: false,
        response: createPaymentRequiredResponse(
          new PaymentVerificationError('Provided x402 payment does not match the requested terms', {
            reason: payment.invalidReason ?? 'invalid_payment',
          }),
          config,
          amountUsd,
          resource,
          resourceUrl
        ),
      };
    }

    return {
      ok: true,
      payment,
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'unknown_error';

    return {
      ok: false,
      response: createPaymentRequiredResponse(
        new PaymentVerificationError('Provided x402 payment could not be verified', {
          reason,
        }),
        config,
        amountUsd,
        resource,
        resourceUrl
      ),
    };
  }
}

export async function settleX402Payment(
  payment: Pick<X402PaymentVerification, 'paymentPayload' | 'paymentRequirements'>,
  options: SharedX402PaymentRequest = {}
): Promise<X402PaymentSettlementResult> {
  const { amountUsd, client, config, resource } = getPaymentContext(options);
  const resourceUrl = payment.paymentRequirements.resource;

  if (isLocalMockMode()) {
    if (payment.paymentPayload.payload.signature === '0xlocalmocksignature') {
      return {
        ok: true,
        payment: {
          invalidReason: null,
          payer: createLocalMockPaymentSettlement().payer,
          paymentPayload: payment.paymentPayload,
          raw: {
            local: true,
            receipt: LOCAL_MOCK_PAYMENT_RECEIPT,
          },
          settlementId: 'local-settlement-1',
          success: true,
          txHash: '0xlocalmocktx',
        },
      };
    }

    return {
      ok: false,
      response: createPaymentRequiredResponse(
        new PaymentVerificationError('Provided x402 payment could not be verified', {
          reason: 'local_mock_receipt_mismatch',
        }),
        config,
        amountUsd,
        resource,
        resourceUrl
      ),
    };
  }

  try {
    const activeClient = client ?? OkxX402Client.fromEnv();
    const settledPayment = await activeClient.settlePayment(
      payment.paymentPayload,
      payment.paymentRequirements
    );

    return {
      ok: true,
      payment: settledPayment,
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'unknown_error';

    return {
      ok: false,
      response: createPaymentRequiredResponse(
        new PaymentVerificationError('Provided x402 payment could not be settled', {
          reason,
        }),
        config,
        amountUsd,
        resource,
        resourceUrl
      ),
    };
  }
}
