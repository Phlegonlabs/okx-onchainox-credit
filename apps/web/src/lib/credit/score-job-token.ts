import { createHmac, timingSafeEqual } from 'node:crypto';
import { getSessionSecret } from '@/lib/env';

interface ScoreJobTokenPayload {
  jobId: string;
  version: 1;
  wallet: string;
}

function sign(encodedPayload: string): string {
  return createHmac('sha256', getSessionSecret()).update(encodedPayload).digest('base64url');
}

export function createScoreJobToken(jobId: string, wallet: string): string {
  const payload = JSON.stringify({
    jobId,
    version: 1,
    wallet,
  } satisfies ScoreJobTokenPayload);
  const encodedPayload = Buffer.from(payload, 'utf-8').toString('base64url');
  const signature = sign(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export function readScoreJobToken(token: string): ScoreJobTokenPayload | null {
  const [encodedPayload, signature] = token.split('.');

  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = sign(encodedPayload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  let payload: ScoreJobTokenPayload;
  try {
    payload = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf-8')
    ) as ScoreJobTokenPayload;
  } catch {
    return null;
  }

  if (payload.version !== 1 || !payload.jobId || !payload.wallet) {
    return null;
  }

  return payload;
}
