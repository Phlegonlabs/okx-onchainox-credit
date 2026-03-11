import { logCredentialIssuance } from '@/lib/credential/audit';
import { createCredentialPayload } from '@/lib/credential/payload';
import { signCredential } from '@/lib/credential/signing';
import { resolveWalletScore } from '@/lib/credit/score-service';
import { ValidationError, toErrorBody } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { classifyPaidOperationFailure } from '@/lib/paid-operation-failure';
import { createWalletHash } from '@/lib/wallet/hash';
import { settleX402Payment, verifyX402Payment } from '@/lib/x402';
import { getAddress, isAddress } from 'ethers';
import { NextResponse } from 'next/server';

interface CredentialRequestBody {
  wallet?: string;
}

export async function POST(request: Request) {
  const requestId = request.headers.get('x-request-id') ?? undefined;

  let body: CredentialRequestBody;
  try {
    body = (await request.json()) as CredentialRequestBody;
  } catch {
    const error = new ValidationError('Invalid request body');
    return NextResponse.json(toErrorBody(error), { status: error.statusCode });
  }

  const rawWallet = body.wallet?.trim();

  if (!rawWallet || !isAddress(rawWallet)) {
    const error = new ValidationError('A valid EVM wallet address is required.');

    return NextResponse.json(toErrorBody(error), { status: error.statusCode });
  }

  const wallet = getAddress(rawWallet);
  const walletHash = createWalletHash(wallet);
  const paymentVerification = await verifyX402Payment(request, {
    resource: 'credential_issuance',
  });
  if (!paymentVerification.ok) {
    return paymentVerification.response;
  }

  const payer = paymentVerification.payment.payer ?? 'unknown_payer';
  const verificationTxHash = paymentVerification.payment.txHash;
  let payload: ReturnType<typeof createCredentialPayload>;
  let scoreTier: Awaited<ReturnType<typeof resolveWalletScore>>['tier'];
  let signature: string;

  try {
    const score = await resolveWalletScore(wallet);
    payload = createCredentialPayload(wallet, score);
    signature = await signCredential(payload);
    scoreTier = score.tier;
  } catch (error) {
    const reason = classifyPaidOperationFailure(error, 'credential_preparation_failed');

    logger.error(
      {
        error: error instanceof Error ? error.message : String(error),
        operation: 'credential.issue',
        payer,
        reason,
        requestId,
        txHash: verificationTxHash,
        walletHash,
      },
      'credential issuance failed'
    );

    return NextResponse.json(
      {
        error: {
          code: 'CREDENTIAL_ISSUANCE_FAILED',
          details: {
            reason,
          },
          message: 'Unable to issue credential.',
        },
      },
      { status: 500 }
    );
  }

  const paymentSettlement = await settleX402Payment(paymentVerification.payment, {
    resource: 'credential_issuance',
  });
  if (!paymentSettlement.ok) {
    return paymentSettlement.response;
  }

  const settledPayer = paymentSettlement.payment.payer ?? payer;
  const txHash = paymentSettlement.payment.txHash ?? verificationTxHash;

  try {
    await logCredentialIssuance({
      expiresAt: payload.expiresAt,
      issuedAt: payload.issuedAt,
      payer: settledPayer,
      scoreTier,
      walletHash,
      x402Tx: txHash,
    });
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : String(error),
        operation: 'credential.issue.audit',
        payer: settledPayer,
        requestId,
        txHash,
        walletHash,
      },
      'credential issuance audit failed'
    );
  }

  logger.info(
    {
      operation: 'credential.issue',
      payer: settledPayer,
      requestId,
      txHash,
      walletHash,
    },
    'credential issued'
  );

  return NextResponse.json({
    ...payload,
    signature,
  });
}
