'use client';

import { formatIsoDateTimeUtc } from '@/lib/date-format';
import { truncateWalletAddress } from '@/lib/wallet/format';
import { type FormEvent, useRef } from 'react';

export function DashboardTargetWalletPanel({
  onApplyTargetWallet,
  onResetTargetWallet,
  onTargetWalletInputChange,
  sessionExpiresAt,
  sessionWallet,
  targetWallet,
  targetWalletError,
  targetWalletInput,
}: {
  onApplyTargetWallet: () => void;
  onResetTargetWallet: () => void;
  onTargetWalletInputChange: (value: string) => void;
  sessionExpiresAt: string;
  sessionWallet: string;
  targetWallet: string | null;
  targetWalletError: string | null;
  targetWalletInput: string;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const hasActiveTarget = targetWallet !== null;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onApplyTargetWallet();
  }

  function handleReset() {
    onResetTargetWallet();
    inputRef.current?.focus();
    inputRef.current?.select();
  }

  return (
    <section className="border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-5 md:p-6">
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="block min-w-0 flex-1">
            <span className="text-xs text-[var(--text-tertiary)]">Target wallet address</span>
            <input
              className="mt-1.5 h-10 w-full border border-[var(--border-subtle)] bg-transparent px-3 font-mono text-sm text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-gold)]"
              onChange={(event) => onTargetWalletInputChange(event.target.value)}
              placeholder="0x..."
              ref={inputRef}
              spellCheck={false}
              type="text"
              value={targetWalletInput}
            />
          </label>

          <div className="flex gap-2">
            <button
              className="h-10 bg-[var(--accent-gold)] px-5 text-sm font-medium text-[var(--surface-base)] transition-colors hover:bg-[var(--accent-gold-hover)]"
              type="submit"
            >
              {hasActiveTarget ? 'Update' : 'Analyze'}
            </button>
            {hasActiveTarget ? (
              <button
                className="h-10 border border-[var(--border-default)] px-4 text-sm text-[var(--text-secondary)] transition-colors hover:border-[var(--text-tertiary)]"
                onClick={handleReset}
                type="button"
              >
                Clear
              </button>
            ) : null}
          </div>
        </div>
        <p className="mt-2 text-xs text-[var(--text-tertiary)]">
          EVM wallets only for now. Solana and other non-EVM address families are not supported on
          this score endpoint yet.
        </p>
      </form>

      {targetWalletError ? (
        <div
          className="mt-3 border border-[var(--error-border)] bg-[var(--error-bg)] px-3 py-2 text-sm text-[var(--error)]"
          role="alert"
        >
          {targetWalletError}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-[var(--text-tertiary)]">
        <span>
          Target:{' '}
          <span
            className="font-mono text-[var(--text-secondary)]"
            title={targetWallet ?? undefined}
          >
            {targetWallet ? truncateWalletAddress(targetWallet) : 'None'}
          </span>
        </span>
        <span>
          Session:{' '}
          <span className="font-mono text-[var(--text-secondary)]" title={sessionWallet}>
            {truncateWalletAddress(sessionWallet)}
          </span>
        </span>
        <span>Expires: {formatIsoDateTimeUtc(sessionExpiresAt)}</span>
      </div>
    </section>
  );
}
