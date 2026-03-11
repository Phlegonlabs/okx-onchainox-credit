'use client';

import { truncateWalletAddress } from '@/lib/wallet/format';
import { type FormEvent, useRef } from 'react';

function formatTimestamp(value: string): string {
  return new Date(value).toLocaleString();
}

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
    <section className="rounded-[32px] border border-[var(--okx-border-light)] bg-[linear-gradient(180deg,rgba(12,18,32,0.96),rgba(8,12,20,0.98))] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.42)] md:p-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
        <article className="rounded-[30px] border border-[var(--okx-border)] bg-[linear-gradient(135deg,rgba(245,166,35,0.1),rgba(9,14,24,0.4)_40%,rgba(9,14,24,0.95))] p-5 md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[var(--okx-accent)]">
                Investigation entry
              </p>
              <h1 className="mt-3 max-w-4xl text-4xl tracking-[-0.05em] text-balance [font-family:var(--font-display)] md:text-6xl">
                Choose the wallet you want to underwrite.
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--okx-text-muted)] md:text-base">
                Sign in once with your OKX wallet, then lock any EVM address as the active
                investigation target. The paid score report and optional credential section open
                only for that selected wallet.
              </p>
            </div>

            <div className="self-start rounded-full border border-[rgba(16,185,129,0.24)] bg-[rgba(16,185,129,0.08)] px-3 py-1 font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--okx-score-excellent)]">
              SIWE verified
            </div>
          </div>

          <form className="mt-8" onSubmit={handleSubmit}>
            <div className="rounded-[28px] border border-[rgba(245,166,35,0.18)] bg-[rgba(8,12,20,0.7)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] md:p-6">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end">
                <label className="block min-w-0 flex-1">
                  <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--okx-text-dim)]">
                    Target wallet address
                  </span>
                  <input
                    className="mt-3 h-16 w-full rounded-[22px] border border-[var(--okx-border)] bg-[rgba(8,12,20,0.96)] px-5 font-mono text-sm text-[var(--color-foreground)] outline-none transition placeholder:text-[var(--okx-text-dim)] focus:border-[var(--okx-accent)] md:text-base"
                    onChange={(event) => onTargetWalletInputChange(event.target.value)}
                    placeholder="Paste the EVM wallet you want to investigate"
                    ref={inputRef}
                    spellCheck={false}
                    type="text"
                    value={targetWalletInput}
                  />
                </label>

                <div className="flex flex-col gap-3 lg:w-[228px]">
                  <button
                    className="min-h-[60px] rounded-[22px] bg-[var(--okx-accent)] px-6 py-3 text-sm font-semibold text-[#080c14] transition hover:bg-[#ffb84d]"
                    type="submit"
                  >
                    {hasActiveTarget ? 'Update Investigation' : 'Open Investigation'}
                  </button>
                  {hasActiveTarget ? (
                    <button
                      className="min-h-[52px] rounded-[22px] border border-[var(--okx-border-light)] bg-[rgba(255,255,255,0.04)] px-4 py-3 text-sm font-medium text-[var(--color-foreground)] transition hover:border-[var(--okx-accent)]"
                      onClick={handleReset}
                      type="button"
                    >
                      Change Target
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {['EVM only', 'Paid unlock before reveal', 'Payer wallet stays separate'].map(
                  (chip) => (
                    <span
                      className="rounded-full border border-[rgba(36,51,82,0.8)] bg-[rgba(255,255,255,0.02)] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--okx-text-dim)]"
                      key={chip}
                    >
                      {chip}
                    </span>
                  )
                )}
              </div>
            </div>
          </form>

          {targetWalletError ? (
            <div
              className="mt-4 rounded-[20px] border border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.08)] px-4 py-3 text-sm leading-7 text-[#f3b0b0]"
              role="alert"
            >
              {targetWalletError}
            </div>
          ) : null}

          <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(220px,0.72fr)]">
            <div className="rounded-[24px] border border-[rgba(36,51,82,0.72)] bg-[rgba(8,12,20,0.66)] p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--okx-text-dim)]">
                  Active target
                </span>
                {hasActiveTarget ? (
                  <span className="rounded-full border border-[rgba(245,166,35,0.28)] bg-[rgba(245,166,35,0.12)] px-3 py-1 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--okx-accent)]">
                    Ready for unlock
                  </span>
                ) : null}
              </div>
              <p
                className="mt-4 font-mono text-2xl text-[var(--color-foreground)] md:text-3xl"
                title={targetWallet ?? undefined}
              >
                {targetWallet ? truncateWalletAddress(targetWallet) : 'No wallet locked'}
              </p>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--okx-text-muted)]">
                {hasActiveTarget
                  ? 'The workspace below is now bound to this wallet. Score unlock and credential issuance will both follow this target until you switch it.'
                  : 'Nothing below will compete for attention until a valid target wallet is locked here.'}
              </p>
            </div>

            <div className="rounded-[24px] border border-[rgba(36,51,82,0.72)] bg-[rgba(255,255,255,0.03)] p-5">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--okx-text-dim)]">
                Session wallet
              </p>
              <p
                className="mt-3 font-mono text-xl text-[var(--color-foreground)]"
                title={sessionWallet}
              >
                {truncateWalletAddress(sessionWallet)}
              </p>
              <p className="mt-3 text-sm leading-7 text-[var(--okx-text-muted)]">
                This wallet stays the payer for x402 unlocks and credential purchases.
              </p>
              <div className="mt-5 rounded-[20px] border border-[rgba(36,51,82,0.72)] bg-[rgba(8,12,20,0.72)] p-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--okx-text-dim)]">
                  Session window
                </p>
                <p className="mt-2 text-sm leading-7 text-[var(--color-foreground)]">
                  {formatTimestamp(sessionExpiresAt)}
                </p>
              </div>
            </div>
          </div>
        </article>

        <aside className="grid gap-4">
          <article className="rounded-[28px] border border-[var(--okx-border)] bg-[rgba(255,255,255,0.03)] p-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--okx-text-dim)]">
              Flow
            </p>
            <ol className="mt-4 grid gap-3 text-sm leading-7 text-[var(--okx-text-muted)]">
              <li>1. Lock the investigated wallet above.</li>
              <li>2. Open the compact unlock panel below.</li>
              <li>3. Pay to reveal the score report and optional credential action.</li>
            </ol>
          </article>

          <article className="rounded-[28px] border border-[var(--okx-border)] bg-[rgba(255,255,255,0.02)] p-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--okx-text-dim)]">
              Product stance
            </p>
            <p className="mt-4 text-sm leading-7 text-[var(--okx-text-muted)]">
              The connected wallet proves who is paying and who owns the session. The investigated
              wallet is always explicit user input.
            </p>
          </article>
        </aside>
      </div>
    </section>
  );
}
