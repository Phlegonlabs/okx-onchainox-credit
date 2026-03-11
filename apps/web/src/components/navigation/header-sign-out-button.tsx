'use client';

import { useOkxWallet } from '@/components/wallet/okx-wallet-context';
import { useRouter } from 'next/navigation';
import { startTransition, useState } from 'react';

export function HeaderSignOutButton() {
  const router = useRouter();
  const { disconnect } = useOkxWallet();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    setIsSigningOut(true);

    try {
      await fetch('/api/auth/sign-out', {
        method: 'POST',
      });
    } finally {
      await disconnect();
      startTransition(() => router.push('/'));
      startTransition(() => router.refresh());
      setIsSigningOut(false);
    }
  }

  return (
    <button
      className="rounded-md text-sm text-[#888] transition hover:text-white disabled:opacity-60"
      disabled={isSigningOut}
      onClick={handleSignOut}
      type="button"
    >
      {isSigningOut ? 'Ending...' : 'Sign Out'}
    </button>
  );
}
