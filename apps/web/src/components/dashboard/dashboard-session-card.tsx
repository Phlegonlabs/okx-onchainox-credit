'use client';

import { useOkxWallet } from '@/components/wallet/okx-wallet-context';
import { formatIsoDateTimeUtc } from '@/lib/date-format';
import { useRouter } from 'next/navigation';
import { startTransition, useState } from 'react';

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
  const { disconnect } = useOkxWallet();
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
    <section className="border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-5 md:p-6">
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-4">
        <h2 className="font-display text-base text-[var(--text-primary)]">Session</h2>
        <span className="border border-[var(--success-border)] bg-[var(--success-bg)] px-2 py-0.5 text-xs text-[var(--score-excellent)]">
          Verified
        </span>
      </div>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="break-all font-mono text-sm text-[var(--text-primary)]">
            {truncateAddress(wallet)}
          </p>
          <p className="mt-1 text-xs text-[var(--text-tertiary)]">
            Expires {formatIsoDateTimeUtc(expiresAt)}
          </p>
        </div>

        <button
          className="border border-[var(--border-default)] px-4 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:border-[var(--text-tertiary)] hover:text-[var(--text-primary)] disabled:opacity-50"
          disabled={isPending}
          onClick={handleSignOut}
          type="button"
        >
          {isPending ? 'Ending...' : 'Sign out'}
        </button>
      </div>
    </section>
  );
}
