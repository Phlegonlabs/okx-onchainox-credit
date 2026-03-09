import { SESSION_COOKIE_NAME, createSessionToken } from '@/lib/session';
import { type SignInPayload, verifySiwePayload } from '@/lib/siwe';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const payload = (await request.json()) as Partial<SignInPayload>;

  if (!payload.message || !payload.signature) {
    return NextResponse.json(
      { error: { code: 'INVALID_INPUT', message: 'Missing SIWE payload.' } },
      { status: 400 }
    );
  }

  const verification = await verifySiwePayload(request, {
    message: payload.message,
    signature: payload.signature,
  });

  if (!verification.success || !verification.wallet) {
    return NextResponse.json(
      { error: { code: 'SIWE_VERIFICATION_FAILED', message: 'Unable to verify SIWE signature.' } },
      { status: 401 }
    );
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

  return response;
}
