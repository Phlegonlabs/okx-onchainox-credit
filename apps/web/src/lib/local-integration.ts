import type { Score } from '@okx-credit/scoring';
import type { X402PaymentSettlement } from './x402/client';
import type { X402Config } from './x402/config';

const DEFAULT_LOCAL_RECIPIENT = '0x1234567890AbcdEF1234567890aBcdef12345678';
const DEFAULT_LOCAL_TOKEN_ADDRESS = '0x779ded0c9e1022225f8e0630b35a9b54be713736';
const DEFAULT_LOCAL_PAYER = '0x90F79bf6EB2c4f870365E785982E1f101E93b906';

export const LOCAL_MOCK_PAYMENT_RECEIPT = 'local-paid';

export function isLocalMockMode(): boolean {
  const mode = process.env.LOCAL_INTEGRATION_MODE?.trim().toLowerCase();

  if (process.env.NODE_ENV === 'production') {
    if (mode === 'mock') {
      throw new Error('LOCAL_INTEGRATION_MODE=mock is not allowed in production');
    }

    return false;
  }

  return mode === 'mock';
}

export function createLocalMockScore(wallet: string, now = new Date()): Score & { wallet: string } {
  const computedAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

  return {
    computedAt,
    dimensions: {
      assetScale: 78,
      multichain: 64,
      positionStability: 74,
      repaymentHistory: 83,
      walletAge: 81,
    },
    expiresAt,
    score: 742,
    tier: 'good',
    wallet,
  };
}

export function getLocalMockX402Config(): X402Config {
  return {
    chainId: 196,
    network: 'xlayer',
    recipient: DEFAULT_LOCAL_RECIPIENT,
    token: 'USDT0',
    tokenAddress: DEFAULT_LOCAL_TOKEN_ADDRESS,
  };
}

export function createLocalMockPaymentSettlement(
  receipt: string = LOCAL_MOCK_PAYMENT_RECEIPT
): X402PaymentSettlement {
  return {
    invalidReason: null,
    payer: DEFAULT_LOCAL_PAYER,
    paymentPayload: {
      chainIndex: '196',
      payload: {
        authorization: {
          from: DEFAULT_LOCAL_PAYER,
          nonce: `0x${'0'.repeat(64)}`,
          to: DEFAULT_LOCAL_RECIPIENT,
          validAfter: '0',
          validBefore: '9999999999',
          value: '500000',
        },
        signature: '0xlocalmocksignature',
      },
      scheme: 'exact',
      x402Version: 1,
    },
    raw: {
      local: true,
      receipt,
    },
    settlementId: 'local-settlement-1',
    success: true,
    txHash: '0xlocalmocktx',
  };
}
