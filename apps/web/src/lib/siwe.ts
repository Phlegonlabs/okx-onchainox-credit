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

export function getExpectedOrigin(request: Request): string {
  const forwardedProto = request.headers.get('x-forwarded-proto');
  const forwardedHost = request.headers.get('x-forwarded-host');
  const host = request.headers.get('host');

  if (forwardedProto && forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  if (host) {
    const protocol =
      host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https';
    return `${protocol}://${host}`;
  }

  return getAppUrl();
}

export async function verifySiwePayload(
  request: Request,
  payload: SignInPayload,
  expectedNonce: string
): Promise<{ success: boolean; wallet?: string }> {
  if (!payload.message || !payload.signature) {
    return { success: false };
  }

  let message: SiweMessage;
  try {
    message = new SiweMessage(payload.message);
  } catch {
    return { success: false };
  }

  if (message.uri !== getExpectedOrigin(request)) {
    return { success: false };
  }

  const result = await message.verify(
    {
      signature: payload.signature,
      domain: getExpectedDomain(request),
      nonce: expectedNonce,
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
