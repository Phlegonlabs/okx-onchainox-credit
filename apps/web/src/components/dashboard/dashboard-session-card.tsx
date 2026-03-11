'use client';

import { useOkxWallet } from '@/components/wallet/okx-wallet-context';
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
    <section className="rounded-lg border border-[#2a2a2a] bg-[#0a0a0a] p-5 md:p-6">
      <div className="flex items-center justify-between border-b border-[#2a2a2a] pb-4">
        <h2 className="text-base font-medium text-white">Session</h2>
        <span className="rounded-md border border-[rgba(5,150,105,0.3)] px-2 py-0.5 text-xs text-[var(--score-excellent)]">
          Verified
        </span>
      </div>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="break-all font-mono text-sm text-white">{truncateAddress(wallet)}</p>
          <p className="mt-1 text-xs text-[#666]">Expires {new Date(expiresAt).toLocaleString()}</p>
        </div>

        <button
          className="rounded-md border border-[#333] px-4 py-2 text-sm text-white transition hover:bg-[#111] disabled:opacity-60"
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
