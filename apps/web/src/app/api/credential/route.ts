import { logCredentialIssuance } from '@/lib/credential/audit';
import { createCredentialPayload } from '@/lib/credential/payload';
import { signCredential } from '@/lib/credential/signing';
import { resolveWalletScore } from '@/lib/credit/score-service';
import { ValidationError, toErrorBody } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { createWalletHash } from '@/lib/wallet/hash';
import { requireX402Payment } from '@/lib/x402';
import { getAddress, isAddress } from 'ethers';
import { NextResponse } from 'next/server';

interface CredentialRequestBody {
  wallet?: string;
}

export async function POST(request: Request) {
  const paymentResult = await requireX402Payment(request, {
    resource: 'credential_issuance',
  });
  if (!paymentResult.ok) {
    return paymentResult.response;
  }

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

  try {
    const score = await resolveWalletScore(wallet);
    const payload = createCredentialPayload(wallet, score);
    const signature = await signCredential(payload);

    await logCredentialIssuance({
      expiresAt: payload.expiresAt,
      issuedAt: payload.issuedAt,
      payer: paymentResult.payment.payer,
      scoreTier: score.tier,
      walletHash,
      x402Tx: paymentResult.payment.txHash,
    });

    logger.info(
      {
        operation: 'credential.issue',
        payer: paymentResult.payment.payer,
        requestId,
        txHash: paymentResult.payment.txHash,
        walletHash,
      },
      'credential issued'
    );

    return NextResponse.json({
      ...payload,
      signature,
    });
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : String(error),
        operation: 'credential.issue',
        payer: paymentResult.payment.payer,
        requestId,
        txHash: paymentResult.payment.txHash,
        walletHash,
      },
      'credential issuance failed'
    );

    return NextResponse.json(
      {
        error: {
          code: 'CREDENTIAL_ISSUANCE_FAILED',
          message: 'Unable to issue credential.',
        },
      },
      { status: 500 }
    );
  }
}
