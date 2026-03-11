import type { X402PaymentRequirements } from './payload';

export interface PaymentRequiredDetails {
  amount: string;
  chainId: number;
  header: string;
  localMockReceipt?: string;
  network: string;
  paymentRequirements: X402PaymentRequirements;
  recipient: string;
  resource: string;
  token: string;
  tokenAddress: string;
}

export function isPaymentRequiredDetails(value: unknown): value is PaymentRequiredDetails {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const details = value as Partial<PaymentRequiredDetails>;

  return (
    typeof details.amount === 'string' &&
    typeof details.chainId === 'number' &&
    typeof details.header === 'string' &&
    typeof details.network === 'string' &&
    !!details.paymentRequirements &&
    typeof details.recipient === 'string' &&
    typeof details.resource === 'string' &&
    typeof details.token === 'string' &&
    typeof details.tokenAddress === 'string'
  );
}
