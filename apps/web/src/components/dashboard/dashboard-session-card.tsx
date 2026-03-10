'use client';

import { useRouter } from 'next/navigation';
import { startTransition, useState } from 'react';
import { useDisconnect } from 'wagmi';

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function DashboardSessionCard({
  expiresAt,
  wallet,
}: {
  expiresAt: string;
  wallet: string;
}) {
  const router = useRouter();
  const { disconnect } = useDisconnect();
  const [isPending, setIsPending] = useState(false);

  async function handleSignOut() {
    setIsPending(true);

    try {
      await fetch('/api/auth/sign-out', {
        method: 'POST',
      });
    } finally {
      disconnect();
      startTransition(() => router.push('/'));
      startTransition(() => router.refresh());
      setIsPending(false);
    }
  }

  return (
    <section className="rounded-[28px] border border-[var(--okx-border-light)] bg-[linear-gradient(180deg,rgba(12,18,32,0.96),rgba(8,12,20,0.98))] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.4)]">
      <div className="flex flex-col gap-4 border-b border-[var(--okx-border)] pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.34em] text-[var(--okx-accent)]">
            Session active
          </p>
          <h1 className="mt-3 text-4xl tracking-[-0.04em] [font-family:var(--font-display)]">
            Dashboard access is now wallet-gated.
          </h1>
        </div>

        <div className="rounded-full border border-[rgba(16,185,129,0.25)] bg-[rgba(16,185,129,0.1)] px-3 py-1 font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--okx-score-excellent)]">
          SIWE verified
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-[1.4fr_0.6fr]">
        <article className="rounded-[24px] border border-[var(--okx-border)] bg-[rgba(255,255,255,0.03)] p-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--okx-text-muted)]">
            Authorized wallet
          </p>
          <p className="mt-4 font-mono text-2xl text-[var(--color-foreground)]">
            {truncateAddress(wallet)}
          </p>
          <p className="mt-2 text-sm text-[var(--okx-text-muted)]">
            Session expires {new Date(expiresAt).toLocaleString()}
          </p>
        </article>

        <button
          className="rounded-[24px] border border-[var(--okx-border-light)] bg-[rgba(255,255,255,0.03)] px-5 py-4 text-sm font-medium text-[var(--color-foreground)] transition hover:border-[var(--okx-accent)] disabled:opacity-60"
          disabled={isPending}
          onClick={handleSignOut}
          type="button"
        >
          {isPending ? 'Ending session...' : 'Sign out'}
        </button>
      </div>
    </section>
  );
}
