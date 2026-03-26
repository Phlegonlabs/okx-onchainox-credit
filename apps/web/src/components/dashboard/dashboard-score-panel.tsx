'use client';

import { parseScoreApiResponse } from '@/lib/credit/score-client';
import { fetchScoreJobSnapshot, subscribeToScoreJob } from '@/lib/credit/score-job-events';
import type { ScoreJobSnapshot, ScoreProcessingPayload } from '@/lib/credit/score-job-payload';
import { getScoreActionMessage } from '@/lib/credit/score-ui';
import { resolveScoreWorkspaceState } from '@/lib/credit/workspace-state';
import { formatIsoDateTimeUtc } from '@/lib/date-format';
import type { SignedScoreQueryPayload } from '@/lib/enterprise/score-payload';
import { truncateWalletAddress } from '@/lib/wallet/format';
import type { PaymentRequiredDetails } from '@/lib/x402/payment-required';
import { useEffect, useRef, useState } from 'react';
import { DashboardScoreView } from './dashboard-score-view';
import { WalletPayButton } from './wallet-pay-button';

const STATUS_POLL_INTERVAL_MS = 3_000;

export function DashboardScorePanel({
  isLocalMockMode = false,
  onScoreUnlocked,
  sessionExpiresAt,
  targetWallet,
}: {
  isLocalMockMode?: boolean;
  onScoreUnlocked?: (score: SignedScoreQueryPayload) => void;
  sessionExpiresAt: string;
  targetWallet: string | null;
}) {
  const [score, setScore] = useState<SignedScoreQueryPayload | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentHeader, setPaymentHeader] = useState('Payment-Signature');
  const [paymentRequired, setPaymentRequired] = useState<PaymentRequiredDetails | null>(null);
  const [processingJob, setProcessingJob] = useState<ScoreProcessingPayload | null>(null);
  const streamCleanupRef = useRef<(() => void) | null>(null);
  const statusPollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canRequestScore = targetWallet !== null;

  function clearActiveJobTransport() {
    streamCleanupRef.current?.();
    streamCleanupRef.current = null;

    if (statusPollRef.current) {
      clearTimeout(statusPollRef.current);
      statusPollRef.current = null;
    }
  }

  function handleJobSnapshot(snapshot: ScoreJobSnapshot) {
    if (snapshot.kind === 'completed') {
      clearActiveJobTransport();
      setProcessingJob(null);
      setErrorMessage(null);
      setPaymentRequired(null);
      setScore(snapshot.result);
      onScoreUnlocked?.(snapshot.result);
      return;
    }

    if (snapshot.kind === 'failed') {
      clearActiveJobTransport();
      setProcessingJob(null);
      setErrorMessage(snapshot.error.message);
      return;
    }

    setProcessingJob(snapshot);
    setErrorMessage(null);
  }

  function startStatusPolling(statusUrl: string) {
    clearActiveJobTransport();

    const run = async () => {
      try {
        const snapshot = await fetchScoreJobSnapshot(statusUrl);

        if (!snapshot) {
          setErrorMessage(getScoreActionMessage(undefined));
          return;
        }

        handleJobSnapshot(snapshot);

        if (snapshot.kind === 'processing') {
          statusPollRef.current = setTimeout(run, STATUS_POLL_INTERVAL_MS);
        }
      } catch {
        setErrorMessage(getScoreActionMessage(undefined));
      }
    };

    statusPollRef.current = setTimeout(run, STATUS_POLL_INTERVAL_MS);
  }

  function startProcessing(processing: ScoreProcessingPayload) {
    clearActiveJobTransport();
    setPaymentRequired(null);
    setProcessingJob(processing);
    setErrorMessage(null);
    streamCleanupRef.current = subscribeToScoreJob(processing.streamUrl, handleJobSnapshot, () =>
      startStatusPolling(processing.statusUrl)
    );
  }

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
      // biome-ignore lint/suspicious/noConsole: diagnostic for x402 payment flow
      console.info('[score] API response', { status: response.status, payload });
      const result = parseScoreApiResponse(response.status, payload);
      // biome-ignore lint/suspicious/noConsole: diagnostic for x402 payment flow
      console.info('[score] parsed result', {
        kind: result.kind,
        ...(result.kind !== 'paid_score' ? { error: (result as { error: unknown }).error } : {}),
      });

      if (result.kind === 'paid_score') {
        clearActiveJobTransport();
        setProcessingJob(null);
        setScore(result.score);
        setPaymentRequired(null);
        onScoreUnlocked?.(result.score);
        return;
      }

      if (result.kind === 'processing') {
        setScore(null);
        startProcessing(result.processing);
        return;
      }

      if (result.kind === 'payment_required') {
        clearActiveJobTransport();
        setProcessingJob(null);
        setScore(null);
        setPaymentHeader(result.paymentRequired.header);
        setPaymentRequired(result.paymentRequired);
        setErrorMessage(
          result.error.code === 'PAYMENT_REQUIRED' ? null : getScoreActionMessage(result.error)
        );
        return;
      }

      setErrorMessage(getScoreActionMessage(result.error));
    } catch (caughtError) {
      // biome-ignore lint/suspicious/noConsole: diagnostic for x402 payment flow
      console.error('[score] requestPaidScore failed', caughtError);
      setErrorMessage(getScoreActionMessage(undefined));
    } finally {
      setIsSubmitting(false);
    }
  }

  useEffect(() => {
    return () => {
      streamCleanupRef.current?.();
      streamCleanupRef.current = null;

      if (statusPollRef.current) {
        clearTimeout(statusPollRef.current);
        statusPollRef.current = null;
      }
    };
  }, []);

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
    hasProcessingJob: processingJob !== null,
    hasScore: score !== null,
    isSubmitting,
    targetWallet,
  });

  return (
    <section
      aria-busy={isSubmitting || processingJob !== null}
      className="border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-5 md:p-6"
    >
      <div className="flex flex-col gap-3 border-b border-[var(--border-subtle)] pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-xl text-[var(--text-primary)]">Score Unlock</h2>
          <p className="mt-1 text-sm text-[var(--text-tertiary)]">
            {targetWallet ? truncateWalletAddress(targetWallet) : 'No target'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isLocalMockMode ? (
            <span className="border border-[var(--border-default)] px-2 py-0.5 text-xs text-[var(--text-tertiary)]">
              Mock
            </span>
          ) : null}
          <span className="border border-[var(--border-subtle)] px-2 py-0.5 text-xs text-[var(--text-tertiary)]">
            {workspaceState === 'payment_required'
              ? 'Quote ready'
              : workspaceState === 'settling'
                ? 'Verifying...'
                : workspaceState === 'processing'
                  ? 'Processing'
                  : workspaceState === 'error'
                    ? 'Error'
                    : 'Ready'}
          </span>
        </div>
      </div>

      <div className="mt-5">
        <button
          className="w-full bg-[var(--accent-gold)] py-2.5 text-sm font-medium text-[var(--surface-base)] transition-colors hover:bg-[var(--accent-gold-hover)] disabled:opacity-50"
          disabled={
            isSubmitting || !canRequestScore || paymentRequired !== null || processingJob !== null
          }
          onClick={() => requestPaidScore()}
          type="button"
        >
          {processingJob
            ? 'Generating report...'
            : paymentRequired
              ? 'Quote requested'
              : isSubmitting
                ? 'Preparing...'
                : 'Unlock Score'}
        </button>

        {isSubmitting ? (
          <output aria-live="polite" className="mt-4 block">
            <div className="grid gap-2">
              <div className="h-1.5 animate-pulse bg-[var(--surface-overlay)]" />
              <div className="h-1.5 w-5/6 animate-pulse bg-[var(--surface-overlay)]" />
            </div>
          </output>
        ) : null}

        {paymentRequired ? (
          <div className="mt-4 space-y-3">
            <div className="border border-[var(--border-subtle)] bg-[var(--surface-base)] p-4">
              <p className="text-xs text-[var(--text-tertiary)]">Payment quote</p>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                {paymentRequired.amount} {paymentRequired.token} on {paymentRequired.network} (chain{' '}
                {paymentRequired.chainId})
              </p>
              <p className="mt-1 break-all text-xs text-[var(--text-tertiary)]">
                Recipient: {paymentRequired.recipient}
              </p>
            </div>

            <WalletPayButton
              disabled={isSubmitting}
              onPaid={(txHash) => requestPaidScore(txHash)}
              payment={paymentRequired}
            />
          </div>
        ) : null}

        {processingJob ? (
          <div className="mt-4 border border-[var(--border-subtle)] bg-[var(--surface-base)] p-4">
            <p className="text-xs text-[var(--text-tertiary)]">Report generation</p>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              {processingJob.statusMessage ?? 'Collecting wallet history from OKX OnchainOS.'}
            </p>
            <p className="mt-2 text-xs text-[var(--text-tertiary)]">
              Attempt {Math.max(processingJob.attemptCount, 1)}
            </p>
            {processingJob.nextAttemptAt ? (
              <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                Next retry: {formatIsoDateTimeUtc(processingJob.nextAttemptAt)}
              </p>
            ) : null}
          </div>
        ) : null}

        {errorMessage ? (
          <div
            className="mt-3 border border-[var(--error-border)] bg-[var(--error-bg)] px-3 py-2 text-sm text-[var(--error)]"
            role="alert"
          >
            {errorMessage}
          </div>
        ) : null}
      </div>
    </section>
  );
}
