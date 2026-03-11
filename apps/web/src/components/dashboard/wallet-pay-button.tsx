'use client';

import { useOkxWallet } from '@/components/wallet/okx-wallet-context';
import {
  buildPaymentAuthorization,
  buildPaymentPayload,
  buildTransferWithAuthorizationTypedData,
  encodePaymentPayloadHeader,
} from '@/lib/x402/payload';
import type { PaymentRequiredDetails } from '@/lib/x402/payment-required';
import { useState } from 'react';

export function WalletPayButton({
  disabled = false,
  onPaid,
  payment,
}: {
  disabled?: boolean;
  onPaid: (paymentHeader: string) => void;
  payment: PaymentRequiredDetails;
}) {
  const { address, signTypedData, switchChain } = useOkxWallet();
  const [isPaying, setIsPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  async function handlePay() {
    setIsPaying(true);
    setPayError(null);

    try {
      if (payment.localMockReceipt) {
        onPaid(payment.localMockReceipt);
        return;
      }

      if (!address) {
        throw new Error('Connect an OKX wallet before attempting payment.');
      }

      await switchChain(payment.chainId);
      const authorization = buildPaymentAuthorization({
        from: address,
        maxAmountRequired: payment.paymentRequirements.maxAmountRequired,
        payTo: payment.paymentRequirements.payTo,
        validForSeconds: payment.paymentRequirements.maxTimeoutSeconds,
      });
      const typedData = buildTransferWithAuthorizationTypedData({
        authorization,
        chainId: payment.chainId,
        domainName: payment.paymentRequirements.extra.domainName,
        ...(payment.paymentRequirements.extra.domainVersion
          ? { domainVersion: payment.paymentRequirements.extra.domainVersion }
          : {}),
        tokenAddress: payment.tokenAddress,
      });
      const signature = await signTypedData(typedData, payment.chainId);
      const paymentPayload = buildPaymentPayload({
        authorization,
        chainId: payment.chainId,
        signature,
      });

      onPaid(encodePaymentPayloadHeader(paymentPayload));
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
