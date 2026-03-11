export interface PaymentRequiredDetails {
  amount: string;
  chainId: number;
  header: string;
  network: string;
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
    typeof details.recipient === 'string' &&
    typeof details.resource === 'string' &&
    typeof details.token === 'string' &&
    typeof details.tokenAddress === 'string'
  );
}
