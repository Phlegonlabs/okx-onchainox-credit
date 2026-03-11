'use client';

import { parseScoreApiResponse } from '@/lib/credit/score-client';
import { getScoreActionMessage } from '@/lib/credit/score-ui';
import { resolveScoreWorkspaceState } from '@/lib/credit/workspace-state';
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

  const statusLabelByState = {
    error: 'Retry available',
    no_target: 'No target',
    payment_required: 'Quote ready',
    settling: 'Settlement running',
    target_locked: 'Target locked',
    unlocked: 'Unlocked',
  } satisfies Record<typeof workspaceState, string>;

  const headlineByState = {
    error: 'The report stayed sealed, but the target wallet is still locked.',
    no_target: 'Lock a wallet to begin.',
    payment_required: 'Payment terms are ready for this wallet.',
    settling: 'Waiting for the payment bridge to clear settlement.',
    target_locked: 'The investigation shell is ready. Unlock the score when you want the report.',
    unlocked: 'Score report ready.',
  } satisfies Record<typeof workspaceState, string>;

  const supportingCopyByState = {
    error:
      'The current target remains selected. You can retry the unlock action without choosing the wallet again.',
    no_target: 'Choose a wallet first, then the unlock panel will open here.',
    payment_required:
      'This release still uses the backend settlement bridge. The wallet-popup payment rail will plug into this same action later.',
    settling:
      'The score workspace is holding the target steady while the payment and settlement checks finish.',
    target_locked:
      'No score data is shown yet. The report opens only after the payer clears the paid score query.',
    unlocked: 'The score report is available below.',
  } satisfies Record<typeof workspaceState, string>;

  return (
    <section
      aria-busy={isSubmitting}
      className="rounded-[32px] border border-[var(--okx-border-light)] bg-[linear-gradient(180deg,rgba(12,18,32,0.96),rgba(8,12,20,0.98))] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.42)] md:p-6"
    >
      <div className="flex flex-col gap-4 border-b border-[var(--okx-border)] pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[var(--okx-accent)]">
            Investigation workspace
          </p>
          <h1 className="mt-3 text-3xl tracking-[-0.04em] text-balance [font-family:var(--font-display)] md:text-5xl">
            {headlineByState[workspaceState]}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--okx-text-muted)]">
            {supportingCopyByState[workspaceState]}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isLocalMockMode ? (
            <div className="self-start rounded-full border border-[rgba(245,166,35,0.28)] bg-[rgba(245,166,35,0.12)] px-3 py-1 font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--okx-accent)]">
              Local mock mode
            </div>
          ) : null}
          <div className="self-start rounded-full border border-[rgba(245,166,35,0.28)] bg-[rgba(245,166,35,0.1)] px-3 py-1 font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--okx-accent)]">
            {statusLabelByState[workspaceState]}
          </div>
          <div className="self-start rounded-full border border-[var(--okx-border)] bg-[rgba(255,255,255,0.03)] px-3 py-1 font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--okx-text-muted)]">
            Session expires {formatTimestamp(sessionExpiresAt)}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)]">
        <article className="rounded-[30px] border border-[var(--okx-border)] bg-[linear-gradient(145deg,rgba(245,166,35,0.08),rgba(11,18,31,0.14)_35%,rgba(8,12,20,0.88))] p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--okx-text-dim)]">
                Report shell
              </p>
              <h2 className="mt-3 text-3xl tracking-[-0.04em] [font-family:var(--font-display)] md:text-4xl">
                {targetWallet ? truncateWalletAddress(targetWallet) : 'No target locked'}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--okx-text-muted)]">
                The wallet is fixed as the investigation subject. The actual score, tier, and
                breakdown stay hidden until the payer clears the paid query.
              </p>
            </div>
            <span className="rounded-full border border-[rgba(245,166,35,0.28)] bg-[rgba(245,166,35,0.1)] px-3 py-1 font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--okx-accent)]">
              300-850 sealed
            </span>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
            <div className="rounded-[28px] border border-[rgba(245,166,35,0.14)] bg-[rgba(8,12,20,0.76)] p-5 text-center">
              <div className="mx-auto flex h-[196px] w-[196px] items-center justify-center rounded-full border border-[rgba(245,166,35,0.18)] bg-[radial-gradient(circle,rgba(245,166,35,0.12),rgba(8,12,20,0.96)_62%)] shadow-[0_0_60px_rgba(245,166,35,0.1)]">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--okx-text-dim)]">
                    Score state
                  </p>
                  <p className="mt-4 text-5xl tracking-[-0.05em] [font-family:var(--font-display)]">
                    sealed
                  </p>
                  <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--okx-accent)]">
                    unlock required
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-[24px] border border-[rgba(36,51,82,0.72)] bg-[rgba(255,255,255,0.03)] p-4">
                  <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--okx-text-dim)]">
                    Target
                  </p>
                  <p className="mt-3 font-mono text-base text-[var(--color-foreground)]">
                    {targetWallet ? truncateWalletAddress(targetWallet) : 'Not selected'}
                  </p>
                </div>
                <div className="rounded-[24px] border border-[rgba(36,51,82,0.72)] bg-[rgba(255,255,255,0.03)] p-4">
                  <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--okx-text-dim)]">
                    Reveal mode
                  </p>
                  <p className="mt-3 text-base text-[var(--color-foreground)]">Pay before score</p>
                </div>
                <div className="rounded-[24px] border border-[rgba(36,51,82,0.72)] bg-[rgba(255,255,255,0.03)] p-4">
                  <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--okx-text-dim)]">
                    Next surface
                  </p>
                  <p className="mt-3 text-base text-[var(--color-foreground)]">
                    Score report, then credential
                  </p>
                </div>
              </div>

              <div className="rounded-[24px] border border-[rgba(36,51,82,0.72)] bg-[rgba(255,255,255,0.02)] p-5">
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--okx-text-dim)]">
                  Reveal includes
                </p>
                <div className="mt-4 grid gap-3 text-sm leading-7 text-[var(--okx-text-muted)] md:grid-cols-2">
                  <p>Signed score payload and tier classification.</p>
                  <p>Five-dimension breakdown and improvement guidance.</p>
                  <p>Freshness window and data gap flags.</p>
                  <p>Optional credential issuance after the score unlock.</p>
                </div>
              </div>
            </div>
          </div>
        </article>

        <article className="rounded-[30px] border border-[var(--okx-border)] bg-[rgba(255,255,255,0.03)] p-5 md:p-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--okx-text-dim)]">
            Unlock rail
          </p>
          <h2 className="mt-3 text-3xl tracking-[-0.03em] [font-family:var(--font-display)]">
            {paymentRequired ? 'Quote ready for settlement' : 'Reveal the score report'}
          </h2>
          <p className="mt-3 text-sm leading-7 text-[var(--okx-text-muted)]">
            This page calls the same paid score API used by protocol and agent consumers. The manual
            receipt bridge stays here only as a temporary browser-side settlement path.
          </p>

          <button
            className="mt-5 min-h-[56px] w-full rounded-[22px] bg-[var(--okx-accent)] px-5 py-3 text-sm font-semibold text-[#080c14] transition hover:bg-[#ffb84d] disabled:opacity-60"
            disabled={isSubmitting || !canRequestScore || paymentRequired !== null}
            onClick={() => requestPaidScore()}
            type="button"
          >
            {paymentRequired
              ? 'Quote already requested'
              : isSubmitting
                ? 'Preparing unlock...'
                : 'Unlock Score'}
          </button>

          <div className="mt-5 rounded-[24px] border border-[rgba(36,51,82,0.72)] bg-[rgba(8,12,20,0.74)] p-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--okx-text-dim)]">
              Current action
            </p>
            <p className="mt-3 text-sm leading-7 text-[var(--okx-text-muted)]">
              {paymentRequired
                ? 'Review the quote, then use the settlement bridge below to finish the unlock.'
                : 'Request the paid score once. The report will remain tied to the active wallet until you change targets.'}
            </p>
          </div>

          {isSubmitting ? (
            <output
              aria-live="polite"
              className="mt-5 rounded-[24px] border border-[rgba(245,166,35,0.22)] bg-[rgba(245,166,35,0.08)] p-5"
            >
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--okx-accent)]">
                {hasReceipt ? 'Verifying settlement' : 'Requesting payment'}
              </p>
              <div className="mt-4 grid gap-3">
                <div className="h-3 animate-pulse rounded-full bg-[rgba(245,166,35,0.16)]" />
                <div className="h-3 w-5/6 animate-pulse rounded-full bg-[rgba(245,166,35,0.12)]" />
                <div className="h-20 animate-pulse rounded-[20px] bg-[rgba(8,12,20,0.62)]" />
              </div>
            </output>
          ) : null}

          {paymentRequired ? (
            <div className="mt-5 grid gap-4">
              <div className="rounded-[24px] border border-[rgba(245,166,35,0.22)] bg-[rgba(245,166,35,0.08)] p-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--okx-accent)]">
                  Quote summary
                </p>
                <div className="mt-4 grid gap-3 text-sm leading-7 text-[var(--okx-text-muted)]">
                  <p>
                    {paymentRequired.amount} {paymentRequired.token} on {paymentRequired.network} (
                    chain {paymentRequired.chainId})
                  </p>
                  <p>Resource {paymentRequired.resource}</p>
                  <p className="break-all">Recipient {paymentRequired.recipient}</p>
                </div>
              </div>

              <details
                className="rounded-[24px] border border-[var(--okx-border)] bg-[rgba(255,255,255,0.02)] p-4"
                open={isLocalMockMode}
              >
                <summary className="cursor-pointer list-none font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--okx-text-dim)]">
                  Manual settlement bridge
                </summary>
                <p className="mt-4 text-sm leading-7 text-[var(--okx-text-muted)]">
                  Until the browser wallet payment rail is wired directly, finish settlement by
                  pasting the x402 receipt returned by your payment client.
                </p>

                <label className="mt-4 block">
                  <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--okx-text-dim)]">
                    Receipt payload
                  </span>
                  <textarea
                    className="mt-2 min-h-28 w-full rounded-[20px] border border-[var(--okx-border)] bg-[rgba(8,12,20,0.9)] px-4 py-3 text-sm text-[var(--color-foreground)] outline-none transition focus:border-[var(--okx-accent)]"
                    onChange={(event) => setPaymentReceipt(event.target.value)}
                    placeholder="Paste the x402 receipt returned by your payment client."
                    value={paymentReceipt}
                  />
                </label>

                <button
                  className="mt-4 min-h-[52px] w-full rounded-[20px] border border-[var(--okx-border-light)] bg-[rgba(255,255,255,0.04)] px-4 py-3 text-sm font-medium text-[var(--color-foreground)] transition hover:border-[var(--okx-accent)] disabled:opacity-60"
                  disabled={isSubmitting || !hasReceipt}
                  onClick={() => requestPaidScore(paymentReceipt.trim())}
                  type="button"
                >
                  {isSubmitting ? 'Unlocking score...' : 'Submit Settlement Receipt'}
                </button>
              </details>
            </div>
          ) : (
            <div className="mt-5 rounded-[24px] border border-[var(--okx-border)] bg-[rgba(255,255,255,0.02)] p-4 text-sm leading-7 text-[var(--okx-text-muted)]">
              A single unlock action opens the score report. After the report is visible, the
              credential section below becomes available for the same target wallet.
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
