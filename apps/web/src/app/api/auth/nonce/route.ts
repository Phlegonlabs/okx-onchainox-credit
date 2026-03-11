import { SIWE_NONCE_COOKIE_NAME, createSiweNonceChallenge } from '@/lib/auth/nonce';
import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
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
  } catch (error) {
    logger.error({ error, operation: 'siwe_nonce_create' }, 'Failed to create SIWE nonce');
    return NextResponse.json(
      { error: { code: 'NONCE_CREATION_FAILED', message: 'Unable to create nonce challenge.' } },
      { status: 500 }
    );
  }
}
