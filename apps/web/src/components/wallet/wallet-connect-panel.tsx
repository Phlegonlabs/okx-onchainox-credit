'use client';

import { createSiweMessage } from '@/lib/auth/siwe-message';
import { useRouter } from 'next/navigation';
import { startTransition, useEffect, useState } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useSignMessage } from 'wagmi';

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function isSameWallet(left: string | null, right: string | null): boolean {
  if (!left || !right) {
    return false;
  }

  return left.toLowerCase() === right.toLowerCase();
}

export function WalletConnectPanel() {
  const router = useRouter();
  const { address, chain, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { isPending: isSigning, signMessageAsync } = useSignMessage();
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [sessionWallet, setSessionWallet] = useState<string | null>(null);

  const hasActiveSession = isSameWallet(sessionWallet, address ?? null);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      try {
        const response = await fetch('/api/auth/session', {
          cache: 'no-store',
        });
        const payload = (await response.json()) as { wallet: string | null };

        if (!cancelled) {
          setSessionWallet(payload.wallet);
        }
      } catch {
        if (!cancelled) {
          setSessionWallet(null);
        }
      }
    }

    void loadSession();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleAuthenticate() {
    if (!address) {
      return;
    }

    setAuthError(null);
    setIsAuthenticating(true);

    try {
      const message = createSiweMessage({
        address,
        chainId: chain?.id ?? 1,
        domain: window.location.host,
        nonce: crypto.randomUUID().replaceAll('-', ''),
        uri: window.location.origin,
      });
      const signature = await signMessageAsync({ message });
      const response = await fetch('/api/auth/sign-in', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          message,
          signature,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: { message?: string } };
        throw new Error(payload.error?.message ?? 'Unable to verify wallet signature.');
      }

      const payload = (await response.json()) as { wallet: string };
      setSessionWallet(payload.wallet);
      startTransition(() => router.push('/dashboard'));
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Unable to start the credit session.');
    } finally {
      setIsAuthenticating(false);
    }
  }

  async function handleDisconnect() {
    setSessionWallet(null);
    setAuthError(null);
    try {
      await fetch('/api/auth/sign-out', {
        method: 'POST',
      });
    } catch {
      // Clear the local wallet state even if the cookie call fails.
    }
    disconnect();
  }

  return (
    <section
      className="relative overflow-hidden rounded-[28px] border border-[var(--okx-border-light)] bg-[linear-gradient(180deg,rgba(13,20,32,0.96),rgba(8,12,20,0.98))] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.35)]"
      id="connect-credit-wallet"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(245,166,35,0.65),transparent)]" />
      <div className="space-y-3 border-b border-[var(--okx-border)] pb-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.34em] text-[var(--okx-accent)]">
          Wallet entry
        </p>
        <h2 className="text-3xl leading-tight tracking-[-0.03em] [font-family:var(--font-display)]">
          Connect a wallet and open the credit session.
        </h2>
        <p className="text-sm leading-7 text-[var(--okx-text-muted)]">
          The connected address becomes the analysis subject for SIWE, score retrieval, and
          credential issuance.
        </p>
      </div>

      {isConnected && address ? (
        <div className="mt-5 grid gap-4 md:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-[24px] border border-[var(--okx-border)] bg-[rgba(17,24,39,0.72)] p-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--okx-text-muted)]">
              Connected Wallet
            </p>
            <p className="mt-4 font-mono text-2xl text-[var(--color-foreground)]" title={address}>
              {truncateAddress(address)}
            </p>
            <p className="mt-2 text-sm text-[var(--okx-text-muted)]">
              {chain ? `${chain.name} · chain ${chain.id}` : 'Chain pending'}
            </p>
          </div>
          <div className="grid gap-3">
            <button
              className="rounded-[24px] border border-[var(--okx-border-light)] bg-[var(--okx-accent)] px-5 py-4 text-sm font-semibold text-[#080c14] transition hover:bg-[#ffb84d] disabled:opacity-60"
              disabled={isAuthenticating || isSigning}
              onClick={hasActiveSession ? () => router.push('/dashboard') : handleAuthenticate}
              type="button"
            >
              {hasActiveSession
                ? 'Open Dashboard'
                : isAuthenticating || isSigning
                  ? 'Awaiting signature...'
                  : 'Sign In With Ethereum'}
            </button>

            <button
              className="rounded-[24px] border border-[var(--okx-border)] bg-[rgba(255,255,255,0.03)] px-5 py-4 text-sm font-medium text-[var(--color-foreground)] transition hover:border-[var(--okx-accent)]"
              onClick={handleDisconnect}
              type="button"
            >
              Disconnect
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {connectors.map((connector) => (
            <button
              className="group min-h-40 rounded-[24px] border border-[var(--okx-border)] bg-[rgba(17,24,39,0.72)] p-5 text-left transition hover:border-[var(--okx-accent)] hover:bg-[rgba(245,166,35,0.06)] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!connector.ready || isPending}
              key={connector.uid}
              onClick={() => connect({ connector })}
              type="button"
            >
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--okx-text-muted)]">
                {connector.type === 'injected' ? 'Browser Wallet' : 'WalletConnect'}
              </p>
              <p className="mt-5 text-2xl leading-tight tracking-[-0.03em] text-[var(--color-foreground)] [font-family:var(--font-display)]">
                {connector.name}
              </p>
              <p className="mt-2 text-sm text-[var(--okx-text-muted)]">
                {!connector.ready
                  ? 'Connector unavailable in this environment.'
                  : isPending
                    ? 'Waiting for wallet approval...'
                    : 'Connect and expose the wallet address through wagmi context.'}
              </p>
            </button>
          ))}
        </div>
      )}

      {isConnected ? (
        <div className="mt-4 rounded-[20px] border border-[rgba(36,51,82,0.72)] bg-[rgba(255,255,255,0.02)] px-4 py-3 text-sm text-[var(--okx-text-muted)]">
          {authError
            ? authError
            : hasActiveSession
              ? 'Session cookie is active. Continue into the dashboard.'
              : 'After connecting, sign a SIWE message to create the wallet session and continue to the dashboard.'}
        </div>
      ) : null}
    </section>
  );
}
