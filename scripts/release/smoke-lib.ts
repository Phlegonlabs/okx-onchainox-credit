const NONCE_COOKIE_NAME = 'graxis_siwe_nonce';
const SAMPLE_WALLET = '0x90F79bf6EB2c4f870365E785982E1f101E93b906';

export interface ReleaseSmokeCheckResult {
  details: string;
  name: string;
  ok: boolean;
}

export interface ReleaseSmokeOptions {
  baseUrl: string;
  fetchImpl?: typeof fetch;
}

function normalizeBaseUrl(baseUrl: string): string {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(baseUrl);
  } catch {
    throw new Error('baseUrl must be a valid absolute URL');
  }

  return parsedUrl.origin;
}

function buildSampleCredentialQuery(): string {
  const issuedAt = 1_730_000_000;
  const credential = {
    dimensions: {
      assetScale: 70,
      multichain: 65,
      positionStability: 72,
      repaymentHistory: 80,
      walletAge: 75,
    },
    expiresAt: issuedAt + 30 * 24 * 60 * 60,
    issuedAt,
    issuer: 'graxis',
    score: 701,
    signature: '0xdeadbeef',
    tier: 'good',
    version: '1.0',
    wallet: SAMPLE_WALLET,
  };

  return encodeURIComponent(JSON.stringify(credential));
}

async function runCheck(
  name: string,
  check: () => Promise<string>
): Promise<ReleaseSmokeCheckResult> {
  try {
    return {
      details: await check(),
      name,
      ok: true,
    };
  } catch (error) {
    return {
      details: error instanceof Error ? error.message : String(error),
      name,
      ok: false,
    };
  }
}

async function expectJsonResponse(
  response: Response,
  expectedStatus: number,
  context: string
): Promise<unknown> {
  if (response.status !== expectedStatus) {
    throw new Error(`${context} returned ${response.status}, expected ${expectedStatus}`);
  }

  return response.json();
}

function assertPaymentChallenge(payload: unknown, resource: string, context: string): string {
  if (!payload || typeof payload !== 'object') {
    throw new Error(`${context} did not return a JSON object`);
  }

  const paymentRequired = (payload as { paymentRequired?: Record<string, unknown> })
    .paymentRequired;

  if (!paymentRequired || typeof paymentRequired !== 'object') {
    throw new Error(`${context} did not include paymentRequired details`);
  }

  if (paymentRequired.resource !== resource) {
    throw new Error(`${context} returned unexpected resource ${String(paymentRequired.resource)}`);
  }

  if (paymentRequired.header !== 'Payment-Signature') {
    throw new Error(`${context} returned an unexpected payment header`);
  }

  return `402 challenge for ${resource}`;
}

export async function runReleaseSmoke({
  baseUrl,
  fetchImpl = fetch,
}: ReleaseSmokeOptions): Promise<ReleaseSmokeCheckResult[]> {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);

  return [
    await runCheck('landing-page', async () => {
      const response = await fetchImpl(normalizedBaseUrl, {
        headers: {
          accept: 'text/html',
        },
      });

      if (response.status < 200 || response.status >= 400) {
        throw new Error(`landing page returned ${response.status}`);
      }

      return `HTTP ${response.status}`;
    }),
    await runCheck('health', async () => {
      const response = await fetchImpl(`${normalizedBaseUrl}/api/health`);
      const payload = (await expectJsonResponse(response, 200, '/api/health')) as {
        status?: string;
        uptime?: unknown;
        version?: string;
      };

      if (payload.status !== 'ok') {
        throw new Error('/api/health status was not ok');
      }

      if (typeof payload.version !== 'string' || payload.version.length === 0) {
        throw new Error('/api/health did not include a version');
      }

      if (typeof payload.uptime !== 'number') {
        throw new Error('/api/health did not include numeric uptime');
      }

      return `version ${payload.version}`;
    }),
    await runCheck('auth-nonce', async () => {
      const response = await fetchImpl(`${normalizedBaseUrl}/api/auth/nonce`);
      const payload = (await expectJsonResponse(response, 200, '/api/auth/nonce')) as {
        expiresAt?: string;
        nonce?: string;
      };
      const cookie = response.headers.get('set-cookie') ?? '';

      if (typeof payload.nonce !== 'string' || payload.nonce.length === 0) {
        throw new Error('/api/auth/nonce did not include a nonce');
      }

      if (typeof payload.expiresAt !== 'string' || payload.expiresAt.length === 0) {
        throw new Error('/api/auth/nonce did not include an expiresAt value');
      }

      if (!cookie.includes(`${NONCE_COOKIE_NAME}=`)) {
        throw new Error('/api/auth/nonce did not set the nonce cookie');
      }

      return 'nonce challenge issued';
    }),
    await runCheck('credential-payment-challenge', async () => {
      const response = await fetchImpl(`${normalizedBaseUrl}/api/credential`, {
        body: JSON.stringify({ wallet: SAMPLE_WALLET }),
        headers: {
          'content-type': 'application/json',
        },
        method: 'POST',
      });
      const payload = await expectJsonResponse(response, 402, '/api/credential');

      return assertPaymentChallenge(payload, 'credential_issuance', '/api/credential');
    }),
    await runCheck('score-payment-challenge', async () => {
      const response = await fetchImpl(
        `${normalizedBaseUrl}/api/v1/score?wallet=${encodeURIComponent(SAMPLE_WALLET)}`
      );
      const payload = await expectJsonResponse(response, 402, '/api/v1/score');

      return assertPaymentChallenge(payload, 'score_query', '/api/v1/score');
    }),
    await runCheck('credential-verify-payment-challenge', async () => {
      const response = await fetchImpl(
        `${normalizedBaseUrl}/api/v1/credential/verify?credential=${buildSampleCredentialQuery()}`
      );
      const payload = await expectJsonResponse(response, 402, '/api/v1/credential/verify');

      return assertPaymentChallenge(
        payload,
        'credential_verification',
        '/api/v1/credential/verify'
      );
    }),
  ];
}
