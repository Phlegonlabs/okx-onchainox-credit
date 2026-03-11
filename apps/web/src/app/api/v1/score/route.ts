import { signCredential } from '@/lib/credential/signing';
import { resolveWalletScore } from '@/lib/credit/score-service';
import { logEnterpriseApiQuery } from '@/lib/enterprise/audit';
import { checkEnterpriseRateLimit } from '@/lib/enterprise/rate-limit';
import { createScoreQueryPayload } from '@/lib/enterprise/score-payload';
import { ValidationError, toErrorBody } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { createWalletHash } from '@/lib/wallet/hash';
import { settleX402Payment, verifyX402Payment } from '@/lib/x402';
import { getScoreQueryPriceUsd } from '@/lib/x402/config';
import { getAddress, isAddress } from 'ethers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestId = request.headers.get('x-request-id') ?? undefined;
  const walletParam = new URL(request.url).searchParams.get('wallet')?.trim();

  if (!walletParam || !isAddress(walletParam)) {
    const error = new ValidationError('A valid EVM wallet address is required.');

    return NextResponse.json(toErrorBody(error), { status: error.statusCode });
  }

  const wallet = getAddress(walletParam);
  const walletHash = createWalletHash(wallet);
  const paymentVerification = await verifyX402Payment(request, {
    amountUsd: getScoreQueryPriceUsd(),
    resource: 'score_query',
  });
  if (!paymentVerification.ok) {
    return paymentVerification.response;
  }

  const payer = paymentVerification.payment.payer ?? 'unknown_payer';
  const rateLimitResult = await checkEnterpriseRateLimit({
    payer,
    resource: 'score_query',
  });
  if (!rateLimitResult.ok) {
    return NextResponse.json(toErrorBody(rateLimitResult.error), {
      headers: {
        'retry-after': String(rateLimitResult.retryAfterSeconds),
      },
      status: rateLimitResult.error.statusCode,
    });
  }

  const paymentSettlement = await settleX402Payment(paymentVerification.payment, {
    amountUsd: getScoreQueryPriceUsd(),
    resource: 'score_query',
  });
  if (!paymentSettlement.ok) {
    return paymentSettlement.response;
  }

  const settledPayer = paymentSettlement.payment.payer ?? payer;
  const txHash = paymentSettlement.payment.txHash ?? paymentVerification.payment.txHash;

  try {
    const score = await resolveWalletScore(wallet);
    const payload = createScoreQueryPayload(wallet, score);
    const signature = await signCredential(payload);
    await logEnterpriseApiQuery({
      metadata: {
        stale: payload.stale,
      },
      payer: settledPayer,
      resource: 'score_query',
      scoreTier: score.tier,
      walletHash,
      x402Tx: txHash,
    });

    logger.info(
      {
        operation: 'api.score.query',
        payer: settledPayer,
        requestId,
        txHash,
        walletHash,
      },
      'enterprise score query served'
    );

    return NextResponse.json({
      ...payload,
      signature,
    });
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : String(error),
        operation: 'api.score.query',
        payer: settledPayer,
        requestId,
        txHash,
        walletHash,
      },
      'enterprise score query failed'
    );

    return NextResponse.json(
      {
        error: {
          code: 'SCORE_QUERY_FAILED',
          message: 'Unable to retrieve wallet score.',
        },
      },
      { status: 500 }
    );
  }
}
