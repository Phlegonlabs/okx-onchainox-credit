import { SIWE_NONCE_COOKIE_NAME, verifySiweNonceChallenge } from '@/lib/auth/nonce';
import { SESSION_COOKIE_NAME, createSessionToken } from '@/lib/session';
import { type SignInPayload, verifySiwePayload } from '@/lib/siwe';
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
    const response = NextResponse.json(
      { error: { code: 'INVALID_INPUT', message: 'Invalid request body.' } },
      { status: 400 }
    );

    clearNonceCookie(response);
    return response;
  }

  if (!payload.message || !payload.signature) {
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
  } catch {
    const response = NextResponse.json(
      { error: { code: 'SIWE_VERIFICATION_FAILED', message: 'Unable to verify SIWE signature.' } },
      { status: 401 }
    );

    clearNonceCookie(response);
    return response;
  }

  const expectedNonce = parsedMessage.nonce;
  if (!verifySiweNonceChallenge(request.headers.get('cookie'), expectedNonce)) {
    const response = NextResponse.json(
      { error: { code: 'SIWE_VERIFICATION_FAILED', message: 'Unable to verify SIWE signature.' } },
      { status: 401 }
    );

    clearNonceCookie(response);
    return response;
  }

  const verification = await verifySiwePayload(
    request,
    {
      message: payload.message,
      signature: payload.signature,
    },
    expectedNonce
  );

  if (!verification.success || !verification.wallet) {
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
