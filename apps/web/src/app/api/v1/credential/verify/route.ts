import { verifyCredentialSignature } from '@/lib/credential/signing';
import { parseCredentialQueryValue } from '@/lib/credential/verification';
import { logEnterpriseApiQuery } from '@/lib/enterprise/audit';
import { checkEnterpriseRateLimit } from '@/lib/enterprise/rate-limit';
import { AppError, toErrorBody } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { createWalletHash } from '@/lib/wallet/hash';
import { settleX402Payment, verifyX402Payment } from '@/lib/x402';
import { getScoreQueryPriceUsd } from '@/lib/x402/config';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestId = request.headers.get('x-request-id') ?? undefined;

  try {
    const credential = parseCredentialQueryValue(
      new URL(request.url).searchParams.get('credential')
    );
    const paymentVerification = await verifyX402Payment(request, {
      amountUsd: getScoreQueryPriceUsd(),
      resource: 'credential_verification',
    });
    if (!paymentVerification.ok) {
      return paymentVerification.response;
    }

    const payer =
      paymentVerification.payment.payer ?? paymentVerification.payment.txHash ?? 'unknown_payer';
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

    const paymentSettlement = await settleX402Payment(paymentVerification.payment.receipt, {
      amountUsd: getScoreQueryPriceUsd(),
      resource: 'credential_verification',
    });
    if (!paymentSettlement.ok) {
      return paymentSettlement.response;
    }

    const settledPayer = paymentSettlement.payment.payer ?? payer;
    const txHash = paymentSettlement.payment.txHash ?? paymentVerification.payment.txHash;
    const { signature, ...payload } = credential;
    const walletHash = createWalletHash(payload.wallet);
    const valid = await verifyCredentialSignature(payload, signature);
    await logEnterpriseApiQuery({
      metadata: {
        expiresAt: payload.expiresAt,
        valid,
      },
      payer: settledPayer,
      resource: 'credential_verification',
      scoreTier: payload.tier,
      walletHash,
      x402Tx: txHash,
    });

    logger.info(
      {
        operation: 'api.credential.verify',
        payer: settledPayer,
        requestId,
        txHash,
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
