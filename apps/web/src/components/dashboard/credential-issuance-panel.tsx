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
      className="rounded-lg border border-[#2a2a2a] bg-[#0a0a0a] p-5 md:p-6"
    >
      <div className="flex flex-col gap-3 border-b border-[#2a2a2a] pb-5 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-medium text-white">Credential</h2>
        <button
          className="rounded-md bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-[#e5e5e5] disabled:opacity-60"
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
            <p className="text-sm text-[#888]">{disabledReason}</p>
          ) : null}

          {isLocalMockMode ? (
            <p className="mt-3 rounded-md border border-[#2a2a2a] bg-black px-3 py-2 text-sm text-[#888]">
              Mock mode active.
            </p>
          ) : null}

          {isSubmitting ? (
            <output aria-live="polite" className="mt-3 block">
              <div className="grid gap-2">
                <div className="h-2 animate-pulse rounded bg-[#1a1a1a]" />
                <div className="h-2 w-5/6 animate-pulse rounded bg-[#1a1a1a]" />
              </div>
            </output>
          ) : paymentRequired ? (
            <div className="mt-3 space-y-3">
              <div className="rounded-md border border-[#2a2a2a] bg-black p-3">
                <p className="text-xs text-[#666]">Credential quote</p>
                <p className="mt-2 text-sm text-[#888]">
                  {paymentRequired.amount} {paymentRequired.token} on {paymentRequired.network}{' '}
                  (chain {paymentRequired.chainId})
                </p>
              </div>

              <details
                className="rounded-md border border-[#2a2a2a] bg-black p-3"
                open={isLocalMockMode}
              >
                <summary className="cursor-pointer text-xs text-[#666]">Settlement bridge</summary>
                <label className="mt-3 block">
                  <span className="text-xs text-[#666]">Receipt</span>
                  <textarea
                    className="mt-1 min-h-20 w-full rounded-md border border-[#2a2a2a] bg-transparent px-3 py-2 text-sm text-white outline-none transition focus:border-[#555]"
                    onChange={(event) => setPaymentReceipt(event.target.value)}
                    placeholder="Paste x402 receipt"
                    value={paymentReceipt}
                  />
                </label>
                <button
                  className="mt-2 w-full rounded-md border border-[#333] px-4 py-2 text-sm text-white transition hover:bg-[#111] disabled:opacity-60"
                  disabled={disabled || isSubmitting || !hasReceipt}
                  onClick={() => requestCredential(paymentReceipt.trim())}
                  type="button"
                >
                  {isSubmitting ? 'Issuing...' : 'Submit Receipt'}
                </button>
              </details>
            </div>
          ) : !disabled && !credential ? (
            <p className="text-sm text-[#888]">
              Click <span className="text-white">Get Credential</span> to fetch payment
              requirements.
            </p>
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

        <div className="min-w-0">
          {isSubmitting ? (
            <output aria-live="polite" className="grid gap-3">
              <div className="grid gap-3 rounded-md border border-[#2a2a2a] bg-black p-4 sm:grid-cols-3">
                {['score', 'issued', 'expires'].map((key) => (
                  <div className="space-y-2" key={key}>
                    <div className="h-2 w-12 animate-pulse rounded bg-[#1a1a1a]" />
                    <div className="h-4 w-16 animate-pulse rounded bg-[#1a1a1a]" />
                  </div>
                ))}
              </div>
              <div className="h-48 animate-pulse rounded-md border border-[#2a2a2a] bg-black" />
            </output>
          ) : credential ? (
            <div className="space-y-3">
              <div className="grid gap-3 rounded-md border border-[#2a2a2a] bg-black p-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-[#666]">Score</p>
                  <p className="mt-1 font-mono text-lg text-white">{credential.score}</p>
                </div>
                <div>
                  <p className="text-xs text-[#666]">Issued</p>
                  <p className="mt-1 text-sm text-white">{formatTimestamp(credential.issuedAt)}</p>
                </div>
                <div>
                  <p className="text-xs text-[#666]">Expires</p>
                  <p className="mt-1 text-sm text-white">{formatTimestamp(credential.expiresAt)}</p>
                </div>
              </div>

              <pre className="max-h-64 overflow-auto rounded-md border border-[#2a2a2a] bg-black p-4 font-mono text-xs leading-relaxed text-[#888]">
                {JSON.stringify(credential, null, 2)}
              </pre>

              <button
                className="w-full rounded-md border border-[#333] px-4 py-2 text-sm text-white transition hover:bg-[#111]"
                onClick={() => downloadCredential(credential)}
                type="button"
              >
                Download JSON
              </button>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center rounded-md border border-[#2a2a2a] bg-black p-8 text-sm text-[#666]">
              Credential will appear here after issuance.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
