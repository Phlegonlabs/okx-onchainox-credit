'use client';

import { useOkxWallet } from '@/components/wallet/okx-wallet-context';
import { createSiweMessage } from '@/lib/auth/siwe-message';
import { truncateWalletAddress } from '@/lib/wallet/format';
import { useRouter } from 'next/navigation';
import { startTransition, useEffect, useState } from 'react';

function isSameWallet(left: string | null, right: string | null): boolean {
  if (!left || !right) {
    return false;
  }

  return left.toLowerCase() === right.toLowerCase();
}

export function WalletConnectPanel() {
  const router = useRouter();
  const {
    address,
    chainId,
    chainName,
    connectApp,
    connectExtension,
    connectorType,
    disconnect,
    extensionAvailable,
    isConnected,
    isConnecting,
    isRestoring,
    pendingConnector,
    signMessage,
    walletLabel,
  } = useOkxWallet();
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [sessionWallet, setSessionWallet] = useState<string | null>(null);

  const hasActiveSession = isSameWallet(sessionWallet, address ?? null);
  const isBusy = isAuthenticating || isConnecting || isRestoring;

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

  async function handleConnectExtension() {
    setAuthError(null);

    try {
      await connectExtension();
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Unable to connect OKX Extension.');
    }
  }

  async function handleConnectApp() {
    setAuthError(null);

    try {
      await connectApp();
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Unable to connect OKX App.');
    }
  }

  async function handleAuthenticate() {
    if (!address) {
      return;
    }

    setAuthError(null);
    setIsAuthenticating(true);

    try {
      const nonceResponse = await fetch('/api/auth/nonce', {
        cache: 'no-store',
      });
      if (!nonceResponse.ok) {
        throw new Error('Unable to create a secure wallet challenge.');
      }

      const noncePayload = (await nonceResponse.json()) as { nonce?: string };
      if (!noncePayload.nonce) {
        throw new Error('Secure wallet challenge is unavailable.');
      }

      const message = createSiweMessage({
        address,
        chainId: chainId ?? 1,
        domain: window.location.host,
        nonce: noncePayload.nonce,
        uri: window.location.origin,
      });
      const signature = await signMessage(message);
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
      startTransition(() => router.refresh());
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
    await disconnect();
    startTransition(() => router.refresh());
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
          Connect through the official OKX wallet rails.
        </h2>
        <p className="text-sm leading-7 text-[var(--okx-text-muted)]">
          The connected address becomes the analysis subject for SIWE, paid score retrieval, and
          credential issuance. Browser extension uses the OKX injected provider; mobile and scan
          flows use OKX Connect.
        </p>
      </div>

      {isConnected && address ? (
        <div className="mt-5 grid gap-4 md:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-[24px] border border-[var(--okx-border)] bg-[rgba(17,24,39,0.72)] p-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--okx-text-muted)]">
              Connected Wallet
            </p>
            <p className="mt-4 font-mono text-2xl text-[var(--color-foreground)]" title={address}>
              {truncateWalletAddress(address)}
            </p>
            <p className="mt-2 text-sm text-[var(--okx-text-muted)]">
              {walletLabel && chainName
                ? `${walletLabel} · ${chainName} · chain ${chainId ?? 'pending'}`
                : (walletLabel ?? 'Chain pending')}
            </p>
          </div>
          <div className="grid gap-3">
            <button
              className="rounded-[24px] border border-[var(--okx-border-light)] bg-[var(--okx-accent)] px-5 py-4 text-sm font-semibold text-[#080c14] transition hover:bg-[#ffb84d] disabled:opacity-60"
              disabled={isBusy}
              onClick={hasActiveSession ? () => router.push('/dashboard') : handleAuthenticate}
              type="button"
            >
              {hasActiveSession
                ? 'Open Dashboard'
                : isAuthenticating
                  ? 'Requesting OKX signature...'
                  : 'Sign In With Ethereum'}
            </button>

            <button
              className="rounded-[24px] border border-[var(--okx-border)] bg-[rgba(255,255,255,0.03)] px-5 py-4 text-sm font-medium text-[var(--color-foreground)] transition hover:border-[var(--okx-accent)]"
              disabled={isBusy}
              onClick={handleDisconnect}
              type="button"
            >
              Disconnect
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <button
            className="group min-h-40 rounded-[24px] border border-[var(--okx-border)] bg-[rgba(17,24,39,0.72)] p-5 text-left transition hover:border-[var(--okx-accent)] hover:bg-[rgba(245,166,35,0.06)] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!extensionAvailable || isBusy}
            onClick={handleConnectExtension}
            type="button"
          >
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--okx-text-muted)]">
              Browser extension
            </p>
            <p className="mt-5 text-2xl leading-tight tracking-[-0.03em] text-[var(--color-foreground)] [font-family:var(--font-display)]">
              OKX Extension
            </p>
            <p className="mt-2 text-sm text-[var(--okx-text-muted)]">
              {!extensionAvailable
                ? 'Install the official OKX extension to use the injected browser flow.'
                : pendingConnector === 'extension'
                  ? 'Waiting for extension approval...'
                  : 'Connect directly through the official OKX injected provider.'}
            </p>
          </button>

          <button
            className="group min-h-40 rounded-[24px] border border-[var(--okx-border)] bg-[rgba(17,24,39,0.72)] p-5 text-left transition hover:border-[var(--okx-accent)] hover:bg-[rgba(59,130,246,0.08)] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isBusy}
            onClick={handleConnectApp}
            type="button"
          >
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--okx-text-muted)]">
              App / mobile
            </p>
            <p className="mt-5 text-2xl leading-tight tracking-[-0.03em] text-[var(--color-foreground)] [font-family:var(--font-display)]">
              OKX App
            </p>
            <p className="mt-2 text-sm text-[var(--okx-text-muted)]">
              {pendingConnector === 'app'
                ? 'Opening OKX Connect...'
                : isRestoring
                  ? 'Restoring the last OKX Connect session...'
                  : 'Open the OKX app or scan through OKX Connect for mobile signing.'}
            </p>
          </button>
        </div>
      )}

      {isConnected || authError ? (
        <div className="mt-4 rounded-[20px] border border-[rgba(36,51,82,0.72)] bg-[rgba(255,255,255,0.02)] px-4 py-3 text-sm text-[var(--okx-text-muted)]">
          {authError
            ? authError
            : hasActiveSession
              ? 'Session cookie is active. Continue into the dashboard.'
              : connectorType === 'app'
                ? 'OKX App is connected. Request the SIWE challenge, sign through OKX Connect, then continue to the paid score dashboard.'
                : 'After connecting, request a one-time SIWE challenge, sign it through OKX Extension, and continue to the paid score dashboard.'}
        </div>
      ) : null}
    </section>
  );
}
