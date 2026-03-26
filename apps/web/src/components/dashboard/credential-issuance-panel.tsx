'use client';

import { parseCredentialApiResponse } from '@/lib/credential/client';
import type { IssuedCredential } from '@/lib/credential/payload';
import { getCredentialActionMessage } from '@/lib/credential/ui';
import { formatUnixDateTimeUtc } from '@/lib/date-format';
import type { PaymentRequiredDetails } from '@/lib/x402/payment-required';
import { useState } from 'react';
import { WalletPayButton } from './wallet-pay-button';

function downloadCredential(credential: IssuedCredential) {
  const blob = new Blob([JSON.stringify(credential, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `graxis-credential-${credential.wallet}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function CredentialIssuancePanel({
  disabled = false,
  disabledReason = null,
  isLocalMockMode = false,
  wallet,
}: {
  disabled?: boolean;
  disabledReason?: string | null;
  isLocalMockMode?: boolean;
  wallet: string | null;
}) {
  const [credential, setCredential] = useState<IssuedCredential | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentHeader, setPaymentHeader] = useState('Payment-Signature');
  const [paymentRequired, setPaymentRequired] = useState<PaymentRequiredDetails | null>(null);

  async function requestCredential(receipt?: string) {
    if (disabled || !wallet) {
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/credential', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(receipt
            ? {
                [paymentHeader]: receipt,
              }
            : {}),
        },
        body: JSON.stringify({ wallet }),
      });
      const payload = (await response.json()) as unknown;
      const result = parseCredentialApiResponse(response.status, payload);

      if (result.kind === 'issued') {
        setCredential(result.credential);
        setPaymentRequired(null);
        return;
      }

      if (result.kind === 'payment_required') {
        setCredential(null);
        setPaymentHeader(result.paymentRequired.header);
        setPaymentRequired(result.paymentRequired);
        setErrorMessage(
          result.error.code === 'PAYMENT_REQUIRED' ? null : getCredentialActionMessage(result.error)
        );
        return;
      }

      setErrorMessage(getCredentialActionMessage(result.error));
    } catch (_error) {
      setErrorMessage(getCredentialActionMessage(undefined));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section
      aria-busy={isSubmitting}
      className="border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-5 md:p-6"
    >
      <div className="flex flex-col gap-3 border-b border-[var(--border-subtle)] pb-5 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-display text-xl text-[var(--text-primary)]">Credential</h2>
        <button
          className="bg-[var(--accent-gold)] px-4 py-2 text-sm font-medium text-[var(--surface-base)] transition-colors hover:bg-[var(--accent-gold-hover)] disabled:opacity-50"
          disabled={disabled || isSubmitting}
          onClick={() => requestCredential()}
          type="button"
        >
          {disabled ? 'Unlock Score First' : isSubmitting ? 'Requesting...' : 'Get Credential'}
        </button>
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)]">
        <div className="min-w-0">
          {disabled && disabledReason ? (
            <p className="text-sm text-[var(--text-tertiary)]">{disabledReason}</p>
          ) : null}

          {isLocalMockMode ? (
            <p className="mt-3 border border-[var(--border-subtle)] bg-[var(--surface-base)] px-3 py-2 text-sm text-[var(--text-tertiary)]">
              Mock mode active.
            </p>
          ) : null}

          {isSubmitting ? (
            <output aria-live="polite" className="mt-3 block">
              <div className="grid gap-2">
                <div className="h-1.5 animate-pulse bg-[var(--surface-overlay)]" />
                <div className="h-1.5 w-5/6 animate-pulse bg-[var(--surface-overlay)]" />
              </div>
            </output>
          ) : paymentRequired ? (
            <div className="mt-3 space-y-3">
              <div className="border border-[var(--border-subtle)] bg-[var(--surface-base)] p-3">
                <p className="text-xs text-[var(--text-tertiary)]">Credential quote</p>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  {paymentRequired.amount} {paymentRequired.token} on {paymentRequired.network}{' '}
                  (chain {paymentRequired.chainId})
                </p>
              </div>

              <WalletPayButton
                disabled={disabled || isSubmitting}
                onPaid={(txHash) => requestCredential(txHash)}
                payment={paymentRequired}
              />
            </div>
          ) : !disabled && !credential ? (
            <p className="text-sm text-[var(--text-tertiary)]">
              Click <span className="text-[var(--text-primary)]">Get Credential</span> to fetch
              payment requirements.
            </p>
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

        <div className="min-w-0">
          {isSubmitting ? (
            <output aria-live="polite" className="grid gap-3">
              <div className="grid gap-3 border border-[var(--border-subtle)] bg-[var(--surface-base)] p-4 sm:grid-cols-3">
                {['score', 'issued', 'expires'].map((key) => (
                  <div className="space-y-2" key={key}>
                    <div className="h-2 w-12 animate-pulse bg-[var(--surface-overlay)]" />
                    <div className="h-4 w-16 animate-pulse bg-[var(--surface-overlay)]" />
                  </div>
                ))}
              </div>
              <div className="h-48 animate-pulse border border-[var(--border-subtle)] bg-[var(--surface-base)]" />
            </output>
          ) : credential ? (
            <div className="space-y-3">
              <div className="grid gap-3 border border-[var(--border-subtle)] bg-[var(--surface-base)] p-4 sm:grid-cols-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.15em] text-[var(--text-tertiary)]">
                    Score
                  </p>
                  <p className="mt-1.5 font-mono text-lg text-[var(--text-primary)]">
                    {credential.score}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.15em] text-[var(--text-tertiary)]">
                    Issued
                  </p>
                  <p className="mt-1.5 text-sm text-[var(--text-primary)]">
                    {formatUnixDateTimeUtc(credential.issuedAt)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.15em] text-[var(--text-tertiary)]">
                    Expires
                  </p>
                  <p className="mt-1.5 text-sm text-[var(--text-primary)]">
                    {formatUnixDateTimeUtc(credential.expiresAt)}
                  </p>
                </div>
              </div>

              <pre className="max-h-64 overflow-auto border border-[var(--border-subtle)] bg-[var(--surface-base)] p-4 font-mono text-xs leading-relaxed text-[var(--text-tertiary)]">
                {JSON.stringify(credential, null, 2)}
              </pre>

              <button
                className="w-full border border-[var(--border-default)] py-2 text-sm text-[var(--text-secondary)] transition-colors hover:border-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                onClick={() => downloadCredential(credential)}
                type="button"
              >
                Download JSON
              </button>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center border border-[var(--border-subtle)] bg-[var(--surface-base)] p-8 text-sm text-[var(--text-tertiary)]">
              Credential will appear here after issuance.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
