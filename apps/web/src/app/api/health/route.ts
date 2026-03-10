import { getHealthStatusPayload } from '@/lib/health';
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(getHealthStatusPayload(), {
    headers: {
      'cache-control': 'no-store',
    },
  });
}
