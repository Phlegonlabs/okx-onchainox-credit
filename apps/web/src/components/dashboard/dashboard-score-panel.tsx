'use client';

import { parseScoreApiResponse } from '@/lib/credit/score-client';
import { getScoreActionMessage } from '@/lib/credit/score-ui';
import type { SignedScoreQueryPayload } from '@/lib/enterprise/score-payload';
import { truncateWalletAddress } from '@/lib/wallet/format';
import type { PaymentRequiredDetails } from '@/lib/x402/payment-required';
import { useState } from 'react';
import { DashboardScoreView } from './dashboard-score-view';

function formatTimestamp(value: string): string {
  return new Date(value).toLocaleString();
}

export function DashboardScorePanel({
  isLocalMockMode = false,
  localMockReceipt = null,
  onScoreUnlocked,
  sessionExpiresAt,
  wallet,
}: {
  isLocalMockMode?: boolean;
  localMockReceipt?: string | null;
  onScoreUnlocked?: (score: SignedScoreQueryPayload) => void;
  sessionExpiresAt: string;
  wallet: string;
}) {
  const [score, setScore] = useState<SignedScoreQueryPayload | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentHeader, setPaymentHeader] = useState('Payment-Signature');
  const [paymentReceipt, setPaymentReceipt] = useState('');
  const [paymentRequired, setPaymentRequired] = useState<PaymentRequiredDetails | null>(null);

  const hasReceipt = paymentReceipt.trim().length > 0;

  async function requestPaidScore(receipt?: string) {
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
        `/api/v1/score?wallet=${encodeURIComponent(wallet)}`,
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

  return (
    <section
      aria-busy={isSubmitting}
      className="rounded-[32px] border border-[var(--okx-border-light)] bg-[linear-gradient(180deg,rgba(12,18,32,0.96),rgba(8,12,20,0.98))] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.42)] md:p-6"
    >
      <div className="flex flex-col gap-4 border-b border-[var(--okx-border)] pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[var(--okx-accent)]">
            Paid score gate
          </p>
          <h1 className="mt-3 text-3xl tracking-[-0.04em] text-balance [font-family:var(--font-display)] md:text-5xl">
            Wallet auth opens the session. x402 payment unlocks the score.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--okx-text-muted)]">
            OKX OnchainOS telemetry is ready for this wallet, but the score surface remains sealed
            until the connected user clears the paid query.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isLocalMockMode ? (
            <div className="self-start rounded-full border border-[rgba(245,166,35,0.28)] bg-[rgba(245,166,35,0.12)] px-3 py-1 font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--okx-accent)]">
              Local mock mode
            </div>
          ) : null}
          <div className="self-start rounded-full border border-[rgba(16,185,129,0.22)] bg-[rgba(16,185,129,0.08)] px-3 py-1 font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--okx-score-excellent)]">
            SIWE verified
          </div>
          <div className="self-start rounded-full border border-[var(--okx-border)] bg-[rgba(255,255,255,0.03)] px-3 py-1 font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--okx-text-muted)]">
            Session expires {formatTimestamp(sessionExpiresAt)}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <article className="min-w-0 lg:border-r lg:border-[rgba(36,51,82,0.72)] lg:pr-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--okx-text-dim)]">
            Connected subject
          </p>
          <div className="mt-4 rounded-[28px] border border-[var(--okx-border)] bg-[rgba(255,255,255,0.03)] p-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--okx-text-muted)]">
              Authorized wallet
            </p>
            <p className="mt-4 font-mono text-2xl text-[var(--color-foreground)]" title={wallet}>
              {truncateWalletAddress(wallet)}
            </p>
            <p className="mt-3 text-sm leading-7 text-[var(--okx-text-muted)]">
              This wallet stays the subject for the paid score query and any later credential
              issuance.
            </p>
          </div>

          <div className="mt-5 rounded-[28px] border border-[var(--okx-border)] bg-[rgba(255,255,255,0.02)] p-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--okx-text-dim)]">
              Unlock sequence
            </p>
            <ol className="mt-4 grid gap-4 text-sm leading-7 text-[var(--okx-text-muted)]">
              <li className="border-b border-[rgba(36,51,82,0.72)] pb-4">
                1. Request the paid score quote for the authenticated wallet.
              </li>
              <li className="border-b border-[rgba(36,51,82,0.72)] pb-4">
                2. Receive x402 settlement requirements from the score API.
              </li>
              <li className="border-b border-[rgba(36,51,82,0.72)] pb-4">
                3. Settle the payment and submit the latest receipt signature.
              </li>
              <li>4. Unlock the signed score payload, gauge, breakdown, and improvement tips.</li>
            </ol>
          </div>
        </article>

        <article className="min-w-0">
          <div className="rounded-[28px] border border-[var(--okx-border)] bg-[linear-gradient(180deg,rgba(245,166,35,0.08),rgba(12,18,32,0.02))] p-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--okx-text-dim)]">
              Score access
            </p>
            <h2 className="mt-3 text-3xl tracking-[-0.03em] [font-family:var(--font-display)]">
              {paymentRequired ? 'Payment quote active' : 'Request a paid score query'}
            </h2>
            <p className="mt-3 text-sm leading-7 text-[var(--okx-text-muted)]">
              The browser uses the same paid score API that agents use. No MCP layer sits in this
              path.
            </p>

            <button
              className="mt-5 min-h-[52px] w-full rounded-full bg-[var(--okx-accent)] px-5 py-3 text-sm font-semibold text-[#080c14] transition hover:bg-[#ffb84d] disabled:opacity-60"
              disabled={isSubmitting}
              onClick={() => requestPaidScore()}
              type="button"
            >
              {isSubmitting && !hasReceipt ? 'Requesting payment...' : 'Request Paid Score'}
            </button>
          </div>

          {isSubmitting ? (
            <output
              aria-live="polite"
              className="mt-5 rounded-[28px] border border-[rgba(245,166,35,0.22)] bg-[rgba(245,166,35,0.08)] p-5"
            >
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--okx-accent)]">
                {hasReceipt ? 'Verifying settlement' : 'Requesting payment'}
              </p>
              <div className="mt-4 grid gap-3">
                <div className="h-3 animate-pulse rounded-full bg-[rgba(245,166,35,0.16)]" />
                <div className="h-3 w-5/6 animate-pulse rounded-full bg-[rgba(245,166,35,0.12)]" />
                <div className="h-24 animate-pulse rounded-[20px] bg-[rgba(8,12,20,0.62)]" />
              </div>
            </output>
          ) : paymentRequired ? (
            <div className="mt-5 rounded-[28px] border border-[rgba(245,166,35,0.22)] bg-[rgba(245,166,35,0.08)] p-5">
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--okx-accent)]">
                Payment required
              </p>
              <div className="mt-4 grid gap-3 text-sm leading-7 text-[var(--okx-text-muted)]">
                <p>
                  {paymentRequired.amount} {paymentRequired.token} on {paymentRequired.network} (
                  chain {paymentRequired.chainId})
                </p>
                <p className="break-all">Recipient {paymentRequired.recipient}</p>
                <p>Resource {paymentRequired.resource}</p>
                <p>Header {paymentRequired.header}</p>
              </div>

              <label className="mt-4 block">
                <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--okx-text-dim)]">
                  Payment receipt
                </span>
                <textarea
                  className="mt-2 min-h-28 w-full rounded-[20px] border border-[var(--okx-border)] bg-[rgba(8,12,20,0.82)] px-4 py-3 text-sm text-[var(--color-foreground)] outline-none transition focus:border-[var(--okx-accent)]"
                  onChange={(event) => setPaymentReceipt(event.target.value)}
                  placeholder="Paste the x402 receipt returned by your payment client."
                  value={paymentReceipt}
                />
              </label>

              <button
                className="mt-4 min-h-[52px] w-full rounded-full border border-[var(--okx-border-light)] bg-[rgba(255,255,255,0.04)] px-4 py-3 text-sm font-medium text-[var(--color-foreground)] transition hover:border-[var(--okx-accent)] disabled:opacity-60"
                disabled={isSubmitting || !hasReceipt}
                onClick={() => requestPaidScore(paymentReceipt.trim())}
                type="button"
              >
                {isSubmitting ? 'Unlocking score...' : 'Submit Receipt and Unlock Score'}
              </button>
            </div>
          ) : (
            <div className="mt-5 rounded-[28px] border border-[var(--okx-border)] bg-[rgba(255,255,255,0.02)] p-5 text-sm leading-7 text-[var(--okx-text-muted)]">
              Request the score quote first. The API will return the x402 settlement terms for this
              wallet before revealing any score data.
            </div>
          )}

          {errorMessage ? (
            <div
              className="mt-4 rounded-[22px] border border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.08)] p-4 text-sm leading-7 text-[#f3b0b0]"
              role="alert"
            >
              {errorMessage}
            </div>
          ) : null}
        </article>
      </div>
    </section>
  );
}
