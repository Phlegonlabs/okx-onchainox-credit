import { PaymentRequiredError, PaymentVerificationError, toErrorBody } from '@/lib/errors';
import { NextResponse } from 'next/server';
import { OkxX402Client, type X402Client, type X402PaymentSettlement } from './client';
import { type X402Config, getCredentialPriceUsd, getX402Config } from './config';

const PAYMENT_SIGNATURE_HEADER = 'payment-signature';

export interface X402PaymentRequest {
  amountUsd?: string;
  client?: X402Client;
  config?: X402Config;
  resource?: string;
}

export type X402PaymentResult =
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

export async function requireX402Payment(
  request: Request,
  options: X402PaymentRequest = {}
): Promise<X402PaymentResult> {
  const amountUsd = options.amountUsd ?? getCredentialPriceUsd();
  const config = options.config ?? getX402Config();
  const resource = options.resource ?? 'credential_issuance';
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

  try {
    const client = options.client ?? OkxX402Client.fromEnv();
    const payment = await client.settlePayment(receipt);

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
