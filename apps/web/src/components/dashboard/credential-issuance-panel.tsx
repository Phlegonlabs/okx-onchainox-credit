'use client';

import { parseCredentialApiResponse } from '@/lib/credential/client';
import type { IssuedCredential } from '@/lib/credential/payload';
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

export function CredentialIssuancePanel({ wallet }: { wallet: string }) {
  const [credential, setCredential] = useState<IssuedCredential | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentHeader, setPaymentHeader] = useState('Payment-Signature');
  const [paymentReceipt, setPaymentReceipt] = useState('');
  const [paymentRequired, setPaymentRequired] = useState<{
    amount: string;
    chainId: number;
    header: string;
    network: string;
    recipient: string;
    resource: string;
    token: string;
    tokenAddress: string;
  } | null>(null);

  async function requestCredential(receipt?: string) {
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
        setPaymentHeader(result.paymentRequired.header);
        setPaymentRequired(result.paymentRequired);
        setErrorMessage(null);
        return;
      }

      setErrorMessage(result.error.message);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to issue credential.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-[28px] border border-[var(--okx-border)] bg-[rgba(12,18,32,0.84)] p-5 md:p-6">
      <div className="flex flex-col gap-3 border-b border-[var(--okx-border)] pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--okx-text-muted)]">
            Credential issuance
          </p>
          <h2 className="mt-3 text-3xl tracking-[-0.04em] text-balance [font-family:var(--font-display)] md:text-4xl">
            Mint a signed credit credential once the x402 payment settles.
          </h2>
        </div>

        <button
          className="min-h-[52px] w-full rounded-full bg-[var(--okx-accent)] px-5 py-3 text-sm font-semibold text-[#080c14] transition hover:bg-[#ffb84d] disabled:opacity-60 md:w-auto"
          disabled={isSubmitting}
          onClick={() => requestCredential()}
          type="button"
        >
          {isSubmitting ? 'Requesting payment...' : 'Get Credential'}
        </button>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <article className="min-w-0 rounded-[24px] border border-[var(--okx-border)] bg-[rgba(255,255,255,0.02)] p-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--okx-text-dim)]">
            Flow
          </p>
          <ol className="mt-4 grid gap-3 text-sm leading-7 text-[var(--okx-text-muted)]">
            <li>1. Request credential issuance for the authenticated wallet.</li>
            <li>2. Receive x402 settlement requirements from the API.</li>
            <li>3. Settle the payment and submit the returned receipt signature.</li>
            <li>4. Download the ECDSA-signed credential JSON.</li>
          </ol>

          {paymentRequired ? (
            <div className="mt-5 rounded-[22px] border border-[rgba(245,166,35,0.22)] bg-[rgba(245,166,35,0.08)] p-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--okx-accent)]">
                Payment required
              </p>
              <div className="mt-4 grid gap-3 text-sm text-[var(--okx-text-muted)]">
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
                disabled={isSubmitting || paymentReceipt.trim().length === 0}
                onClick={() => requestCredential(paymentReceipt.trim())}
                type="button"
              >
                {isSubmitting ? 'Issuing credential...' : 'Submit Receipt and Issue'}
              </button>
            </div>
          ) : (
            <div className="mt-5 rounded-[22px] border border-[var(--okx-border)] bg-[rgba(255,255,255,0.02)] p-4 text-sm leading-7 text-[var(--okx-text-muted)]">
              Click <span className="text-[var(--color-foreground)]">Get Credential</span> to fetch
              the current x402 payment requirements for this wallet.
            </div>
          )}

          {errorMessage ? (
            <div className="mt-4 rounded-[22px] border border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.08)] p-4 text-sm leading-7 text-[#f3b0b0]">
              {errorMessage}
            </div>
          ) : null}
        </article>

        <article className="min-w-0 rounded-[24px] border border-[var(--okx-border)] bg-[rgba(255,255,255,0.02)] p-5">
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

          {credential ? (
            <div className="mt-5 grid gap-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-[20px] border border-[var(--okx-border)] bg-[rgba(8,12,20,0.82)] p-4">
                  <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--okx-text-dim)]">
                    Score
                  </p>
                  <p className="mt-3 text-3xl [font-family:var(--font-display)]">
                    {credential.score}
                  </p>
                </div>
                <div className="rounded-[20px] border border-[var(--okx-border)] bg-[rgba(8,12,20,0.82)] p-4">
                  <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--okx-text-dim)]">
                    Issued
                  </p>
                  <p className="mt-3 text-sm text-[var(--color-foreground)]">
                    {formatTimestamp(credential.issuedAt)}
                  </p>
                </div>
                <div className="rounded-[20px] border border-[var(--okx-border)] bg-[rgba(8,12,20,0.82)] p-4">
                  <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--okx-text-dim)]">
                    Expires
                  </p>
                  <p className="mt-3 text-sm text-[var(--color-foreground)]">
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
