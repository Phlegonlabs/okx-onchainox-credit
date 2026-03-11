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
    <section className="rounded-lg border border-[#2a2a2a] bg-[#0a0a0a] p-5 md:p-6">
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="block min-w-0 flex-1">
            <span className="text-xs text-[#888]">Target wallet address</span>
            <input
              className="mt-1.5 h-10 w-full rounded-md border border-[#2a2a2a] bg-transparent px-3 font-mono text-sm text-white outline-none transition placeholder:text-[#444] focus:border-[#555]"
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
              className="h-10 rounded-md bg-white px-4 text-sm font-medium text-black transition hover:bg-[#e5e5e5]"
              type="submit"
            >
              {hasActiveTarget ? 'Update' : 'Analyze'}
            </button>
            {hasActiveTarget ? (
              <button
                className="h-10 rounded-md border border-[#333] px-4 text-sm text-white transition hover:bg-[#111]"
                onClick={handleReset}
                type="button"
              >
                Clear
              </button>
            ) : null}
          </div>
        </div>
      </form>

      {targetWalletError ? (
        <div
          className="mt-3 rounded-md border border-[rgba(220,38,38,0.3)] bg-[rgba(220,38,38,0.08)] px-3 py-2 text-sm text-red-400"
          role="alert"
        >
          {targetWalletError}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-[#666]">
        <span>
          Target:{' '}
          <span className="font-mono text-[#888]" title={targetWallet ?? undefined}>
            {targetWallet ? truncateWalletAddress(targetWallet) : 'None'}
          </span>
        </span>
        <span>
          Session:{' '}
          <span className="font-mono text-[#888]" title={sessionWallet}>
            {truncateWalletAddress(sessionWallet)}
          </span>
        </span>
        <span>Expires: {formatIsoDateTimeUtc(sessionExpiresAt)}</span>
      </div>
    </section>
  );
}
