import { SiweMessage } from 'siwe';
import { getAppUrl } from './env';

export interface SignInPayload {
  message: string;
  signature: string;
}

export function getExpectedDomain(request: Request): string {
  const forwardedHost = request.headers.get('x-forwarded-host');
  const host = request.headers.get('host');

  if (forwardedHost) {
    return forwardedHost;
  }

  if (host) {
    return host;
  }

  return new URL(getAppUrl()).host;
}

export async function verifySiwePayload(
  request: Request,
  payload: SignInPayload
): Promise<{ success: boolean; wallet?: string }> {
  if (!payload.message || !payload.signature) {
    return { success: false };
  }

  const message = new SiweMessage(payload.message);
  const result = await message.verify(
    {
      signature: payload.signature,
      domain: getExpectedDomain(request),
      nonce: message.nonce,
      time: new Date().toISOString(),
    },
    {
      suppressExceptions: true,
    }
  );

  if (!result.success) {
    return { success: false };
  }

  return {
    success: true,
    wallet: result.data.address,
  };
}
