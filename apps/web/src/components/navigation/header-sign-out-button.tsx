'use client';

import { useRouter } from 'next/navigation';
import { startTransition, useState } from 'react';

export function HeaderSignOutButton() {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    setIsSigningOut(true);

    try {
      await fetch('/api/auth/sign-out', {
        method: 'POST',
      });
    } finally {
      startTransition(() => router.push('/'));
      startTransition(() => router.refresh());
      setIsSigningOut(false);
    }
  }

  return (
    <button
      className="rounded-full bg-[var(--okx-accent)] px-4 py-2 text-sm font-semibold text-[#080c14] transition hover:bg-[#ffb84d] disabled:opacity-60"
      disabled={isSigningOut}
      onClick={handleSignOut}
      type="button"
    >
      {isSigningOut ? 'Ending...' : 'Sign Out'}
    </button>
  );
}
