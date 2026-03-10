import { verifyCredentialSignature } from '@/lib/credential/signing';
import { parseCredentialQueryValue } from '@/lib/credential/verification';
import { logEnterpriseApiQuery } from '@/lib/enterprise/audit';
import { checkEnterpriseRateLimit } from '@/lib/enterprise/rate-limit';
import { AppError, toErrorBody } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { createWalletHash } from '@/lib/wallet/hash';
import { requireX402Payment } from '@/lib/x402';
import { getScoreQueryPriceUsd } from '@/lib/x402/config';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const paymentResult = await requireX402Payment(request, {
    amountUsd: getScoreQueryPriceUsd(),
    resource: 'credential_verification',
  });
  if (!paymentResult.ok) {
    return paymentResult.response;
  }

  const payer =
    paymentResult.payment.payer ?? paymentResult.payment.settlementId ?? 'unknown_payer';
  const rateLimitResult = await checkEnterpriseRateLimit({
    payer,
    resource: 'credential_verification',
  });
  if (!rateLimitResult.ok) {
    return NextResponse.json(toErrorBody(rateLimitResult.error), {
      headers: {
        'retry-after': String(rateLimitResult.retryAfterSeconds),
      },
      status: rateLimitResult.error.statusCode,
    });
  }

  const requestId = request.headers.get('x-request-id') ?? undefined;

  try {
    const credential = parseCredentialQueryValue(
      new URL(request.url).searchParams.get('credential')
    );
    const { signature, ...payload } = credential;
    const walletHash = createWalletHash(payload.wallet);
    const valid = await verifyCredentialSignature(payload, signature);
    await logEnterpriseApiQuery({
      metadata: {
        expiresAt: payload.expiresAt,
        valid,
      },
      payer,
      resource: 'credential_verification',
      scoreTier: payload.tier,
      walletHash,
      x402Tx: paymentResult.payment.txHash,
    });

    logger.info(
      {
        operation: 'api.credential.verify',
        payer,
        requestId,
        txHash: paymentResult.payment.txHash,
        valid,
        walletHash,
      },
      'credential verification served'
    );

    return NextResponse.json({
      expiresAt: payload.expiresAt,
      score: payload.score,
      valid,
      wallet: payload.wallet,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(toErrorBody(error), { status: error.statusCode });
    }

    logger.error(
      {
        error: error instanceof Error ? error.message : String(error),
        operation: 'api.credential.verify',
        payer,
        requestId,
      },
      'credential verification failed'
    );

    return NextResponse.json(
      {
        error: {
          code: 'CREDENTIAL_VERIFICATION_FAILED',
          message: 'Unable to verify credential.',
        },
      },
      { status: 500 }
    );
  }
}
