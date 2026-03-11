'use client';

import { useOkxWallet } from '@/components/wallet/okx-wallet-context';
import { buildErc20TransferData } from '@/lib/wallet/erc20-transfer';
import type { PaymentRequiredDetails } from '@/lib/x402/payment-required';
import { useState } from 'react';

export function WalletPayButton({
  disabled = false,
  onPaid,
  payment,
}: {
  disabled?: boolean;
  onPaid: (txHash: string) => void;
  payment: PaymentRequiredDetails;
}) {
  const { sendTransaction } = useOkxWallet();
  const [isPaying, setIsPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  async function handlePay() {
    setIsPaying(true);
    setPayError(null);

    try {
      const data = buildErc20TransferData(payment.recipient, payment.amount);
      const txHash = await sendTransaction({
        to: payment.tokenAddress,
        data,
      });
      onPaid(txHash);
    } catch (error) {
      setPayError(error instanceof Error ? error.message : 'Payment failed.');
    } finally {
      setIsPaying(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        className="w-full rounded-md bg-white px-4 py-2.5 text-sm font-medium text-black transition hover:bg-[#e5e5e5] disabled:opacity-60"
        disabled={disabled || isPaying}
        onClick={handlePay}
        type="button"
      >
        {isPaying ? 'Confirm in wallet...' : `Pay ${payment.amount} ${payment.token}`}
      </button>
      {payError ? (
        <div
          className="rounded-md border border-[rgba(220,38,38,0.3)] bg-[rgba(220,38,38,0.08)] px-3 py-2 text-sm text-red-400"
          role="alert"
        >
          {payError}
        </div>
      ) : null}
    </div>
  );
}
