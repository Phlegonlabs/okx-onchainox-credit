import { PaymentRequiredError, PaymentVerificationError, toErrorBody } from '@/lib/errors';
import {
  LOCAL_MOCK_PAYMENT_RECEIPT,
  createLocalMockPaymentSettlement,
  getLocalMockX402Config,
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
  resource: string
): {
  amount: string;
  chainId: number;
  header: string;
  network: string;
  recipient: string;
  resource: string;
  token: string;
  tokenAddress: string;
} {
  return {
    amount: amountUsd,
    chainId: config.chainId,
    header: 'Payment-Signature',
    network: config.network,
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
  resource: string
): NextResponse {
  return NextResponse.json(
    {
      ...toErrorBody(error),
      paymentRequired: buildPaymentRequiredDetails(config, amountUsd, resource),
    },
    { status: 402 }
  );
}

function normalizeAddress(value: string | null | undefined): string | null {
  return value?.trim().toLowerCase() || null;
}

function normalizeAmount(value: string): string {
  const parsed = Number(value.trim());
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error('x402 amount must be a positive number');
  }

  return parsed.toFixed(2);
}

function normalizeText(value: string | null | undefined): string | null {
  return value?.trim().toLowerCase() || null;
}

function getPaymentContext(options: SharedX402PaymentRequest) {
  return {
    amountUsd: options.amountUsd ?? getCredentialPriceUsd(),
    client: options.client,
    config: options.config ?? getX402Config(),
    resource: options.resource ?? 'credential_issuance',
  };
}

function getPaymentTermsMismatchReason(
  payment: X402PaymentVerification,
  config: X402Config,
  amountUsd: string,
  resource: string
): string | null {
  if (!payment.amount || normalizeAmount(payment.amount) !== normalizeAmount(amountUsd)) {
    return 'amount_mismatch';
  }

  if (payment.chainId !== config.chainId) {
    return 'chain_id_mismatch';
  }

  if (normalizeText(payment.network) !== normalizeText(config.network)) {
    return 'network_mismatch';
  }

  if (normalizeAddress(payment.recipient) !== normalizeAddress(config.recipient)) {
    return 'recipient_mismatch';
  }

  if (normalizeText(payment.token) !== normalizeText(config.token)) {
    return 'token_mismatch';
  }

  if (normalizeAddress(payment.tokenAddress) !== normalizeAddress(config.tokenAddress)) {
    return 'token_address_mismatch';
  }

  if (normalizeText(payment.resource) !== normalizeText(resource)) {
    return 'resource_mismatch';
  }

  return null;
}

function createLocalMockPaymentVerification(
  receipt: string,
  config: X402Config,
  amountUsd: string,
  resource: string
): X402PaymentVerification {
  const settlement = createLocalMockPaymentSettlement(receipt);

  return {
    amount: normalizeAmount(amountUsd),
    chainId: config.chainId,
    network: config.network,
    payer: settlement.payer,
    raw: {
      local: true,
      receipt,
    },
    receipt,
    recipient: config.recipient,
    resource,
    token: config.token,
    tokenAddress: config.tokenAddress,
    txHash: settlement.txHash,
  };
}

export async function verifyX402Payment(
  request: Request,
  options: SharedX402PaymentRequest = {}
): Promise<X402PaymentVerificationResult> {
  const { amountUsd, client, config, resource } = getPaymentContext(options);
  const receipt = request.headers.get(PAYMENT_SIGNATURE_HEADER)?.trim();

  if (!receipt) {
    return {
      ok: false,
      response: createPaymentRequiredResponse(
        new PaymentRequiredError('x402 payment required for this resource'),
        config,
        amountUsd,
        resource
      ),
    };
  }

  if (isLocalMockMode()) {
    if (receipt === LOCAL_MOCK_PAYMENT_RECEIPT) {
      return {
        ok: true,
        payment: createLocalMockPaymentVerification(
          receipt,
          options.config ?? getLocalMockX402Config(),
          amountUsd,
          resource
        ),
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
        resource
      ),
    };
  }

  try {
    const activeClient = client ?? OkxX402Client.fromEnv();
    const payment = await activeClient.verifyPayment(receipt);
    const mismatchReason = getPaymentTermsMismatchReason(payment, config, amountUsd, resource);

    if (mismatchReason) {
      return {
        ok: false,
        response: createPaymentRequiredResponse(
          new PaymentVerificationError('Provided x402 payment does not match the requested terms', {
            reason: mismatchReason,
          }),
          config,
          amountUsd,
          resource
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
        resource
      ),
    };
  }
}

export async function settleX402Payment(
  receipt: string,
  options: SharedX402PaymentRequest = {}
): Promise<X402PaymentSettlementResult> {
  const { amountUsd, client, config, resource } = getPaymentContext(options);

  if (isLocalMockMode()) {
    if (receipt === LOCAL_MOCK_PAYMENT_RECEIPT) {
      return {
        ok: true,
        payment: createLocalMockPaymentSettlement(receipt),
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
        resource
      ),
    };
  }

  try {
    const activeClient = client ?? OkxX402Client.fromEnv();
    const payment = await activeClient.settlePayment(receipt);

    return {
      ok: true,
      payment,
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
        resource
      ),
    };
  }
}
