import { signCredential } from '@/lib/credential/signing';
import { getCachedScoreSnapshot } from '@/lib/credit/score-cache';
import {
  buildScoreJobSnapshot,
  createOrReuseScoreJob,
  markScoreJobSettled,
  markScoreJobSettlementFailed,
} from '@/lib/credit/score-job-service';
import { logEnterpriseApiQuery } from '@/lib/enterprise/audit';
import { checkEnterpriseRateLimit } from '@/lib/enterprise/rate-limit';
import { createScoreQueryPayload } from '@/lib/enterprise/score-payload';
import { ValidationError, toErrorBody } from '@/lib/errors';
import { isLocalMockMode } from '@/lib/local-integration';
import { logger } from '@/lib/logger';
import { createWalletHash } from '@/lib/wallet/hash';
import { settleX402Payment, verifyX402Payment } from '@/lib/x402';
import { getScoreQueryPriceUsd } from '@/lib/x402/config';
import { getAddress, isAddress } from 'ethers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestId = request.headers.get('x-request-id') ?? undefined;
  const url = new URL(request.url);
  const walletParam = url.searchParams.get('wallet')?.trim();

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
  const verificationTxHash = paymentVerification.payment.txHash;

  try {
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
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : String(error),
        operation: 'api.score.rate_limit',
        payer,
        requestId,
        walletHash,
      },
      'enterprise score rate limit check failed; allowing paid query'
    );
  }

  const cachedScore = await getCachedScoreSnapshot({
    wallet,
  });

  if (cachedScore.freshness === 'fresh' && cachedScore.record) {
    const payload = createScoreQueryPayload(wallet, {
      computedAt: cachedScore.record.computedAt,
      dataGaps: [],
      dimensions: cachedScore.record.dimensions,
      expiresAt: cachedScore.record.expiresAt,
      score: cachedScore.record.score,
      stale: false,
      tier: cachedScore.record.tier,
    });
    const signature = isLocalMockMode()
      ? '0xlocalmockcredentialsignature'
      : await signCredential(payload);
    const paymentSettlement = await settleX402Payment(paymentVerification.payment, {
      amountUsd: getScoreQueryPriceUsd(),
      resource: 'score_query',
    });

    if (!paymentSettlement.ok) {
      logger.error(
        {
          operation: 'api.score.settlement',
          payer,
          requestId,
          txHash: verificationTxHash,
          walletHash,
        },
        'x402 settlement failed after fresh cache hit'
      );

      return NextResponse.json(
        {
          error: {
            code: 'SETTLEMENT_FAILED',
            message:
              'Payment was verified but settlement failed. Your funds were not charged. Please retry.',
          },
        },
        { status: 500 }
      );
    }

    const settledPayer = paymentSettlement.payment.payer ?? payer;
    const txHash = paymentSettlement.payment.txHash ?? verificationTxHash;

    try {
      await logEnterpriseApiQuery({
        metadata: {
          stale: false,
        },
        payer: settledPayer,
        resource: 'score_query',
        scoreTier: payload.tier,
        walletHash,
        x402Tx: txHash,
      });
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
          operation: 'api.score.audit',
          payer: settledPayer,
          requestId,
          txHash,
          walletHash,
        },
        'enterprise score audit log failed after cache hit'
      );
    }

    return NextResponse.json({
      ...payload,
      signature,
    });
  }

  const jobHandle = await createOrReuseScoreJob(wallet, payer);
  let job = jobHandle.job;

  if (!job.x402Tx) {
    const paymentSettlement = await settleX402Payment(paymentVerification.payment, {
      amountUsd: getScoreQueryPriceUsd(),
      resource: 'score_query',
    });

    if (!paymentSettlement.ok) {
      await markScoreJobSettlementFailed(job.id);
      logger.error(
        {
          operation: 'api.score.settlement',
          payer,
          requestId,
          txHash: verificationTxHash,
          walletHash,
        },
        'x402 settlement failed before score job acceptance'
      );

      return NextResponse.json(
        {
          error: {
            code: 'SETTLEMENT_FAILED',
            message:
              'Payment was verified but settlement failed. Your funds were not charged. Please retry.',
          },
        },
        { status: 500 }
      );
    }

    const txHash = paymentSettlement.payment.txHash ?? verificationTxHash;
    job = await markScoreJobSettled(job.id, txHash ?? 'unknown_tx');
  }

  const snapshot = buildScoreJobSnapshot(job, jobHandle.jobToken, url.origin);

  logger.info(
    {
      operation: 'api.score.query',
      payer,
      requestId,
      status: job.status,
      walletHash,
      x402Tx: job.x402Tx,
    },
    'enterprise score job accepted'
  );

  return NextResponse.json(snapshot, { status: 202 });
}
