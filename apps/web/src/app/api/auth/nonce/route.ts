import { SIWE_NONCE_COOKIE_NAME, createSiweNonceChallenge } from '@/lib/auth/nonce';
import { NextResponse } from 'next/server';

export async function GET() {
  const challenge = createSiweNonceChallenge();
  const response = NextResponse.json({
    expiresAt: challenge.expiresAt,
    nonce: challenge.nonce,
  });

  response.cookies.set({
    name: SIWE_NONCE_COOKIE_NAME,
    value: challenge.token,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: new Date(challenge.expiresAt),
  });

  return response;
}
