import { SIWE_NONCE_COOKIE_NAME, verifySiweNonceChallenge } from '@/lib/auth/nonce';
import { logger } from '@/lib/logger';
import { SESSION_COOKIE_NAME, createSessionToken } from '@/lib/session';
import {
  type SignInPayload,
  getExpectedDomain,
  getExpectedOrigin,
  verifySiwePayload,
} from '@/lib/siwe';
import { NextResponse } from 'next/server';
import { SiweMessage } from 'siwe';

function clearNonceCookie(response: NextResponse) {
  response.cookies.set({
    name: SIWE_NONCE_COOKIE_NAME,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: new Date(0),
  });
}

export async function POST(request: Request) {
  let payload: Partial<SignInPayload>;
  try {
    payload = (await request.json()) as Partial<SignInPayload>;
  } catch {
    logger.warn({ operation: 'siwe_sign_in' }, 'Invalid request body');
    const response = NextResponse.json(
      { error: { code: 'INVALID_INPUT', message: 'Invalid request body.' } },
      { status: 400 }
    );

    clearNonceCookie(response);
    return response;
  }

  if (!payload.message || !payload.signature) {
    logger.warn({ operation: 'siwe_sign_in' }, 'Missing SIWE payload fields');
    const response = NextResponse.json(
      { error: { code: 'INVALID_INPUT', message: 'Missing SIWE payload.' } },
      { status: 400 }
    );

    clearNonceCookie(response);
    return response;
  }

  let parsedMessage: SiweMessage;
  try {
    parsedMessage = new SiweMessage(payload.message);
  } catch (error) {
    logger.warn({ error, operation: 'siwe_sign_in' }, 'Failed to parse SIWE message');
    const response = NextResponse.json(
      { error: { code: 'SIWE_VERIFICATION_FAILED', message: 'Unable to verify SIWE signature.' } },
      { status: 401 }
    );

    clearNonceCookie(response);
    return response;
  }

  const expectedNonce = parsedMessage.nonce;
  const hasCookie = request.headers.get('cookie')?.includes(SIWE_NONCE_COOKIE_NAME) ?? false;

  if (!verifySiweNonceChallenge(request.headers.get('cookie'), expectedNonce)) {
    logger.warn(
      { operation: 'siwe_sign_in', hasCookie, expectedNonce: expectedNonce.slice(0, 8) },
      'Nonce verification failed'
    );
    const response = NextResponse.json(
      { error: { code: 'SIWE_VERIFICATION_FAILED', message: 'Unable to verify SIWE signature.' } },
      { status: 401 }
    );

    clearNonceCookie(response);
    return response;
  }

  const expectedDomain = getExpectedDomain(request);
  const expectedOrigin = getExpectedOrigin(request);

  const verification = await verifySiwePayload(
    request,
    {
      message: payload.message,
      signature: payload.signature,
    },
    expectedNonce
  );

  if (!verification.success || !verification.wallet) {
    logger.warn(
      {
        operation: 'siwe_sign_in',
        messageDomain: parsedMessage.domain,
        messageUri: parsedMessage.uri,
        expectedDomain,
        expectedOrigin,
      },
      'SIWE signature verification failed'
    );
    const response = NextResponse.json(
      { error: { code: 'SIWE_VERIFICATION_FAILED', message: 'Unable to verify SIWE signature.' } },
      { status: 401 }
    );

    clearNonceCookie(response);
    return response;
  }

  const { token, expiresAt } = createSessionToken(verification.wallet);
  const response = NextResponse.json({
    wallet: verification.wallet,
    expiresAt,
  });

  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: new Date(expiresAt),
  });
  clearNonceCookie(response);

  return response;
}
