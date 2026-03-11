'use client';

import { parseCredentialApiResponse } from '@/lib/credential/client';
import type { IssuedCredential } from '@/lib/credential/payload';
import { getCredentialActionMessage } from '@/lib/credential/ui';
import type { PaymentRequiredDetails } from '@/lib/x402/payment-required';
import { useState } from 'react';

function formatTimestamp(seconds: number): string {
  return new Date(seconds * 1_000).toLocaleString();
}

function downloadCredential(credential: IssuedCredential) {
  const blob = new Blob([JSON.stringify(credential, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `okx-credit-credential-${credential.wallet}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function CredentialIssuancePanel({
  disabled = false,
  disabledReason = null,
  isLocalMockMode = false,
  localMockReceipt = null,
  wallet,
}: {
  disabled?: boolean;
  disabledReason?: string | null;
  isLocalMockMode?: boolean;
  localMockReceipt?: string | null;
  wallet: string | null;
}) {
  const [credential, setCredential] = useState<IssuedCredential | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentHeader, setPaymentHeader] = useState('Payment-Signature');
  const [paymentReceipt, setPaymentReceipt] = useState('');
  const [paymentRequired, setPaymentRequired] = useState<PaymentRequiredDetails | null>(null);
  const hasReceipt = paymentReceipt.trim().length > 0;

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
        setPaymentReceipt('');
        return;
      }

      if (result.kind === 'payment_required') {
        setCredential(null);
        setPaymentHeader(result.paymentRequired.header);
        setPaymentRequired(result.paymentRequired);
        setErrorMessage(
          result.error.code === 'PAYMENT_REQUIRED' ? null : getCredentialActionMessage(result.error)
        );
        setPaymentReceipt(isLocalMockMode ? (localMockReceipt ?? '') : '');
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
      className="rounded-[32px] border border-[var(--okx-border)] bg-[rgba(12,18,32,0.78)] p-5 md:p-6"
    >
      <div className="flex flex-col gap-3 border-b border-[var(--okx-border)] pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--okx-text-muted)]">
            Optional credential
          </p>
          <h2 className="mt-3 text-3xl tracking-[-0.04em] text-balance [font-family:var(--font-display)] md:text-4xl">
            Package this report into a reusable signed credential.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--okx-text-muted)]">
            This stays below the score report on purpose. The target wallet is already chosen;
            credential issuance is only the optional export step after the paid score unlock.
          </p>
        </div>

        <button
          className="min-h-[52px] w-full rounded-full bg-[var(--okx-accent)] px-5 py-3 text-sm font-semibold text-[#080c14] transition hover:bg-[#ffb84d] disabled:opacity-60 md:w-auto"
          disabled={disabled || isSubmitting}
          onClick={() => requestCredential()}
          type="button"
        >
          {disabled
            ? 'Unlock Paid Score First'
            : isSubmitting
              ? 'Requesting payment...'
              : 'Get Credential'}
        </button>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)]">
        <article className="min-w-0 lg:border-r lg:border-[rgba(36,51,82,0.72)] lg:pr-8">
          <div className="rounded-[24px] border border-[rgba(36,51,82,0.72)] bg-[rgba(255,255,255,0.03)] p-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--okx-text-dim)]">
              Flow
            </p>
            <ol className="mt-4 grid gap-3 text-sm leading-7 text-[var(--okx-text-muted)]">
              <li>1. Keep the active target wallet locked.</li>
              <li>2. Use the paid score report as the current source of truth.</li>
              <li>3. Request the credential only if you need a reusable signed artifact.</li>
            </ol>
          </div>

          {disabled && disabledReason ? (
            <div className="mt-6 rounded-[22px] border border-[rgba(59,130,246,0.22)] bg-[rgba(59,130,246,0.08)] p-4 text-sm leading-7 text-[var(--okx-text-muted)]">
              {disabledReason}
            </div>
          ) : null}

          {isLocalMockMode ? (
            <div className="mt-6 rounded-[22px] border border-[rgba(245,166,35,0.22)] bg-[rgba(245,166,35,0.08)] p-4 text-sm leading-7 text-[var(--okx-text-muted)]">
              Local mock mode is active. Use the prefilled receipt to simulate x402 settlement
              without the live payment network.
            </div>
          ) : null}

          {isSubmitting ? (
            <output
              aria-live="polite"
              className="mt-6 rounded-[24px] border border-[rgba(245,166,35,0.22)] bg-[rgba(245,166,35,0.08)] p-4"
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
            <div className="mt-5 grid gap-4">
              <div className="rounded-[22px] border border-[rgba(245,166,35,0.22)] bg-[rgba(245,166,35,0.08)] p-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--okx-accent)]">
                  Credential quote
                </p>
                <div className="mt-4 grid gap-3 text-sm text-[var(--okx-text-muted)]">
                  <p>
                    {paymentRequired.amount} {paymentRequired.token} on {paymentRequired.network} (
                    chain {paymentRequired.chainId})
                  </p>
                  <p>Resource {paymentRequired.resource}</p>
                  <p className="break-all">Recipient {paymentRequired.recipient}</p>
                </div>
              </div>

              <details
                className="rounded-[22px] border border-[var(--okx-border)] bg-[rgba(255,255,255,0.02)] p-4"
                open={isLocalMockMode}
              >
                <summary className="cursor-pointer list-none font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--okx-text-dim)]">
                  Manual settlement bridge
                </summary>
                <p className="mt-4 text-sm leading-7 text-[var(--okx-text-muted)]">
                  Finish credential settlement by pasting the receipt payload returned by your
                  payment client. This is temporary until the wallet-popup rail replaces it.
                </p>

                <label className="mt-4 block">
                  <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--okx-text-dim)]">
                    Receipt payload
                  </span>
                  <textarea
                    className="mt-2 min-h-28 w-full rounded-[20px] border border-[var(--okx-border)] bg-[rgba(8,12,20,0.82)] px-4 py-3 text-sm text-[var(--color-foreground)] outline-none transition focus:border-[var(--okx-accent)]"
                    onChange={(event) => setPaymentReceipt(event.target.value)}
                    placeholder="Paste the x402 receipt returned by your payment client."
                    value={paymentReceipt}
                  />
                </label>

                <button
                  className="mt-4 min-h-[52px] w-full rounded-[20px] border border-[var(--okx-border-light)] bg-[rgba(255,255,255,0.04)] px-4 py-3 text-sm font-medium text-[var(--color-foreground)] transition hover:border-[var(--okx-accent)] disabled:opacity-60"
                  disabled={disabled || isSubmitting || !hasReceipt}
                  onClick={() => requestCredential(paymentReceipt.trim())}
                  type="button"
                >
                  {isSubmitting ? 'Issuing credential...' : 'Submit Settlement Receipt'}
                </button>
              </details>
            </div>
          ) : (
            <div className="mt-5 rounded-[22px] border border-[var(--okx-border)] bg-[rgba(255,255,255,0.02)] p-4 text-sm leading-7 text-[var(--okx-text-muted)]">
              {disabled ? (
                wallet ? (
                  'Unlock the paid score first. The dashboard only opens credential issuance after the active target wallet’s score query settles.'
                ) : (
                  'Lock a target wallet first. Credential issuance only opens after a target wallet is selected and its paid score is unlocked.'
                )
              ) : (
                <>
                  Click <span className="text-[var(--color-foreground)]">Get Credential</span> to
                  fetch the current x402 payment requirements for this target wallet.
                </>
              )}
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

        <article className="min-w-0">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--okx-text-dim)]">
                Credential output
              </p>
              <h3 className="mt-3 text-2xl tracking-[-0.03em] [font-family:var(--font-display)] md:text-3xl">
                {credential ? 'Signed credential ready' : 'Awaiting issuance'}
              </h3>
            </div>

            {credential ? (
              <button
                className="min-h-[48px] w-full rounded-full border border-[var(--okx-border-light)] bg-[rgba(255,255,255,0.04)] px-4 py-2 text-sm font-medium text-[var(--color-foreground)] transition hover:border-[var(--okx-accent)] sm:w-auto"
                onClick={() => downloadCredential(credential)}
                type="button"
              >
                Download JSON
              </button>
            ) : null}
          </div>

          {isSubmitting ? (
            <output aria-live="polite" className="mt-5 grid gap-4">
              <div className="grid gap-4 rounded-[24px] border border-[var(--okx-border)] bg-[rgba(255,255,255,0.03)] p-4 md:grid-cols-3">
                {['score', 'issued', 'expires'].map((key) => (
                  <div className="space-y-3 md:px-3" key={key}>
                    <div className="h-3 w-16 animate-pulse rounded-full bg-[rgba(255,255,255,0.08)]" />
                    <div className="mt-4 h-6 w-20 animate-pulse rounded-full bg-[rgba(245,166,35,0.16)]" />
                  </div>
                ))}
              </div>
              <div className="h-64 animate-pulse rounded-[20px] border border-[var(--okx-border)] bg-[rgba(8,12,20,0.92)]" />
            </output>
          ) : credential ? (
            <div className="mt-5 grid gap-4">
              <div className="grid gap-4 rounded-[24px] border border-[var(--okx-border)] bg-[rgba(255,255,255,0.03)] p-4 md:grid-cols-3">
                <div className="space-y-2 md:px-3">
                  <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--okx-text-dim)]">
                    Score
                  </p>
                  <p className="text-3xl [font-family:var(--font-display)]">{credential.score}</p>
                </div>
                <div className="space-y-2 md:px-3">
                  <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--okx-text-dim)]">
                    Issued
                  </p>
                  <p className="text-sm text-[var(--color-foreground)]">
                    {formatTimestamp(credential.issuedAt)}
                  </p>
                </div>
                <div className="space-y-2 md:px-3">
                  <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--okx-text-dim)]">
                    Expires
                  </p>
                  <p className="text-sm text-[var(--color-foreground)]">
                    {formatTimestamp(credential.expiresAt)}
                  </p>
                </div>
              </div>

              <pre className="max-h-80 overflow-auto rounded-[20px] border border-[var(--okx-border)] bg-[rgba(8,12,20,0.92)] p-4 text-xs leading-6 text-[var(--okx-accent-soft)]">
                {JSON.stringify(credential, null, 2)}
              </pre>
            </div>
          ) : (
            <div className="mt-5 rounded-[22px] border border-[var(--okx-border)] bg-[rgba(8,12,20,0.82)] p-4 text-sm leading-7 text-[var(--okx-text-muted)]">
              Once payment verifies, the dashboard will render the signed credential payload here
              and provide a direct JSON download.
            </div>
          )}
        </article>
      </div>
    </section>
  );
}
