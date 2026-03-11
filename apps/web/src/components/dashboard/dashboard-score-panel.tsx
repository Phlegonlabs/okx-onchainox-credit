'use client';

import { parseScoreApiResponse } from '@/lib/credit/score-client';
import { getScoreActionMessage } from '@/lib/credit/score-ui';
import { resolveScoreWorkspaceState } from '@/lib/credit/workspace-state';
import type { SignedScoreQueryPayload } from '@/lib/enterprise/score-payload';
import { truncateWalletAddress } from '@/lib/wallet/format';
import type { PaymentRequiredDetails } from '@/lib/x402/payment-required';
import { useState } from 'react';
import { DashboardScoreView } from './dashboard-score-view';

export function DashboardScorePanel({
  isLocalMockMode = false,
  localMockReceipt = null,
  onScoreUnlocked,
  sessionExpiresAt,
  targetWallet,
}: {
  isLocalMockMode?: boolean;
  localMockReceipt?: string | null;
  onScoreUnlocked?: (score: SignedScoreQueryPayload) => void;
  sessionExpiresAt: string;
  targetWallet: string | null;
}) {
  const [score, setScore] = useState<SignedScoreQueryPayload | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentHeader, setPaymentHeader] = useState('Payment-Signature');
  const [paymentReceipt, setPaymentReceipt] = useState('');
  const [paymentRequired, setPaymentRequired] = useState<PaymentRequiredDetails | null>(null);

  const hasReceipt = paymentReceipt.trim().length > 0;
  const canRequestScore = targetWallet !== null;

  async function requestPaidScore(receipt?: string) {
    if (!targetWallet) {
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const requestInit: RequestInit = {
        cache: 'no-store',
      };

      if (receipt) {
        requestInit.headers = {
          [paymentHeader]: receipt,
        };
      }

      const response = await fetch(
        `/api/v1/score?wallet=${encodeURIComponent(targetWallet)}`,
        requestInit
      );
      const payload = (await response.json()) as unknown;
      const result = parseScoreApiResponse(response.status, payload);

      if (result.kind === 'paid_score') {
        setScore(result.score);
        setPaymentRequired(null);
        setPaymentReceipt('');
        onScoreUnlocked?.(result.score);
        return;
      }

      if (result.kind === 'payment_required') {
        setScore(null);
        setPaymentHeader(result.paymentRequired.header);
        setPaymentRequired(result.paymentRequired);
        setPaymentReceipt(isLocalMockMode ? (localMockReceipt ?? '') : paymentReceipt);
        setErrorMessage(
          result.error.code === 'PAYMENT_REQUIRED' ? null : getScoreActionMessage(result.error)
        );
        return;
      }

      setErrorMessage(getScoreActionMessage(result.error));
    } catch (_error) {
      setErrorMessage(getScoreActionMessage(undefined));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (score) {
    return (
      <DashboardScoreView
        isLocalMockMode={isLocalMockMode}
        score={score}
        sessionExpiresAt={sessionExpiresAt}
      />
    );
  }

  const workspaceState = resolveScoreWorkspaceState({
    errorMessage,
    hasPaymentRequired: paymentRequired !== null,
    hasScore: score !== null,
    isSubmitting,
    targetWallet,
  });

  return (
    <section
      aria-busy={isSubmitting}
      className="rounded-lg border border-[#2a2a2a] bg-[#0a0a0a] p-5 md:p-6"
    >
      <div className="flex flex-col gap-3 border-b border-[#2a2a2a] pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-medium text-white">Score Unlock</h2>
          <p className="mt-1 text-sm text-[#888]">
            {targetWallet ? truncateWalletAddress(targetWallet) : 'No target'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isLocalMockMode ? (
            <span className="rounded-md border border-[#333] px-2 py-1 text-xs text-[#888]">
              Mock mode
            </span>
          ) : null}
          <span className="rounded-md border border-[#2a2a2a] px-2 py-1 text-xs text-[#666]">
            {workspaceState === 'payment_required'
              ? 'Quote ready'
              : workspaceState === 'settling'
                ? 'Settling...'
                : workspaceState === 'error'
                  ? 'Error'
                  : 'Ready'}
          </span>
        </div>
      </div>

      <div className="mt-5">
        <button
          className="w-full rounded-md bg-white px-4 py-2.5 text-sm font-medium text-black transition hover:bg-[#e5e5e5] disabled:opacity-60"
          disabled={isSubmitting || !canRequestScore || paymentRequired !== null}
          onClick={() => requestPaidScore()}
          type="button"
        >
          {paymentRequired ? 'Quote requested' : isSubmitting ? 'Preparing...' : 'Unlock Score'}
        </button>

        {isSubmitting ? (
          <output aria-live="polite" className="mt-4 block">
            <div className="grid gap-2">
              <div className="h-2 animate-pulse rounded bg-[#1a1a1a]" />
              <div className="h-2 w-5/6 animate-pulse rounded bg-[#1a1a1a]" />
            </div>
          </output>
        ) : null}

        {paymentRequired ? (
          <div className="mt-4 space-y-3">
            <div className="rounded-md border border-[#2a2a2a] bg-black p-4">
              <p className="text-xs text-[#666]">Payment quote</p>
              <p className="mt-2 text-sm text-[#888]">
                {paymentRequired.amount} {paymentRequired.token} on {paymentRequired.network} (chain{' '}
                {paymentRequired.chainId})
              </p>
              <p className="mt-1 break-all text-xs text-[#666]">
                Recipient: {paymentRequired.recipient}
              </p>
            </div>

            <details
              className="rounded-md border border-[#2a2a2a] bg-black p-4"
              open={isLocalMockMode}
            >
              <summary className="cursor-pointer text-xs text-[#666]">
                Manual settlement bridge
              </summary>
              <label className="mt-3 block">
                <span className="text-xs text-[#666]">Receipt payload</span>
                <textarea
                  className="mt-1.5 min-h-20 w-full rounded-md border border-[#2a2a2a] bg-transparent px-3 py-2 text-sm text-white outline-none transition focus:border-[#555]"
                  onChange={(event) => setPaymentReceipt(event.target.value)}
                  placeholder="Paste x402 receipt"
                  value={paymentReceipt}
                />
              </label>
              <button
                className="mt-3 w-full rounded-md border border-[#333] px-4 py-2 text-sm text-white transition hover:bg-[#111] disabled:opacity-60"
                disabled={isSubmitting || !hasReceipt}
                onClick={() => requestPaidScore(paymentReceipt.trim())}
                type="button"
              >
                {isSubmitting ? 'Unlocking...' : 'Submit Receipt'}
              </button>
            </details>
          </div>
        ) : null}

        {errorMessage ? (
          <div
            className="mt-3 rounded-md border border-[rgba(220,38,38,0.3)] bg-[rgba(220,38,38,0.08)] px-3 py-2 text-sm text-red-400"
            role="alert"
          >
            {errorMessage}
          </div>
        ) : null}
      </div>
    </section>
  );
}
