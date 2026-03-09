import { getSessionFromCookieHeader } from '@/lib/session';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const session = getSessionFromCookieHeader(request.headers.get('cookie'));

  return NextResponse.json({
    wallet: session?.wallet ?? null,
    expiresAt: session?.expiresAt ?? null,
  });
}
