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

function navigateToDashboard() {
  window.location.assign('/dashboard');
}

function extractErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message: unknown }).message);
  }

  return fallback;
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
      // biome-ignore lint/suspicious/noConsole: intentional client-side diagnostic for SIWE failures
      console.error('[SIWE] extension connect failed:', error);
      setAuthError(extractErrorMessage(error, 'Unable to connect OKX Extension.'));
    }
  }

  async function handleConnectApp() {
    setAuthError(null);

    try {
      await connectApp();
    } catch (error) {
      // biome-ignore lint/suspicious/noConsole: intentional client-side diagnostic for SIWE failures
      console.error('[SIWE] app connect failed:', error);
      setAuthError(extractErrorMessage(error, 'Unable to connect OKX App.'));
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
        const body = await response.text();
        // biome-ignore lint/suspicious/noConsole: intentional client-side diagnostic for SIWE failures
        console.error('[SIWE] sign-in response:', response.status, body);
        let serverMessage = 'Unable to verify wallet signature.';
        try {
          const parsed = JSON.parse(body) as { error?: { message?: string } };
          serverMessage = parsed.error?.message ?? serverMessage;
        } catch {
          // response was not JSON
        }
        throw new Error(serverMessage);
      }

      const payload = (await response.json()) as { wallet: string };
      setSessionWallet(payload.wallet);
      navigateToDashboard();
    } catch (error) {
      // biome-ignore lint/suspicious/noConsole: intentional client-side diagnostic for SIWE failures
      console.error(
        '[SIWE] sign-in failed:',
        error instanceof Error ? error.message : JSON.stringify(error)
      );
      setAuthError(extractErrorMessage(error, 'Unable to start the credit session.'));
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
      className="rounded-lg border border-[#2a2a2a] bg-[#0a0a0a] p-5"
      id="connect-credit-wallet"
    >
      <div className="space-y-1 border-b border-[#2a2a2a] pb-4">
        <h2 className="text-lg font-medium text-white">Connect Wallet</h2>
        <p className="text-sm text-[#666]">Connect your OKX wallet to sign in and start scoring.</p>
      </div>

      {isConnected && address ? (
        <div className="mt-4 space-y-3">
          <div className="rounded-md border border-[#2a2a2a] bg-black p-4">
            <p className="text-xs text-[#666]">Connected wallet</p>
            <p className="mt-1 font-mono text-sm text-white" title={address}>
              {truncateWalletAddress(address)}
            </p>
            {walletLabel && chainName ? (
              <p className="mt-1 text-xs text-[#666]">
                {walletLabel} · {chainName} · chain {chainId ?? 'pending'}
              </p>
            ) : null}
          </div>
          <button
            className="w-full rounded-md bg-white px-4 py-2.5 text-sm font-medium text-black transition hover:bg-[#e5e5e5] disabled:opacity-60"
            disabled={isBusy}
            onClick={hasActiveSession ? navigateToDashboard : handleAuthenticate}
            type="button"
          >
            {hasActiveSession
              ? 'Open Dashboard'
              : isAuthenticating
                ? 'Requesting signature...'
                : 'Sign In With Ethereum'}
          </button>

          <button
            className="w-full rounded-md border border-[#333] px-4 py-2.5 text-sm text-white transition hover:bg-[#111]"
            disabled={isBusy}
            onClick={handleDisconnect}
            type="button"
          >
            Disconnect
          </button>
        </div>
      ) : (
        <div className="mt-4 grid gap-3">
          <button
            className="rounded-md border border-[#2a2a2a] bg-black p-4 text-left transition hover:border-[#444] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!extensionAvailable || isBusy}
            onClick={handleConnectExtension}
            type="button"
          >
            <p className="text-sm font-medium text-white">Browser Extension</p>
            <p className="mt-1 text-sm text-[#666]">
              {!extensionAvailable
                ? 'Install the OKX extension first.'
                : pendingConnector === 'extension'
                  ? 'Waiting for approval...'
                  : 'Connect via OKX injected provider.'}
            </p>
          </button>

          <button
            className="rounded-md border border-[#2a2a2a] bg-black p-4 text-left transition hover:border-[#444] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isBusy}
            onClick={handleConnectApp}
            type="button"
          >
            <p className="text-sm font-medium text-white">OKX App</p>
            <p className="mt-1 text-sm text-[#666]">
              {pendingConnector === 'app'
                ? 'Opening OKX Connect...'
                : isRestoring
                  ? 'Restoring session...'
                  : 'Mobile or scan via OKX Connect.'}
            </p>
          </button>
        </div>
      )}

      {authError ? (
        <div className="mt-3 rounded-md border border-[rgba(220,38,38,0.3)] bg-[rgba(220,38,38,0.08)] px-3 py-2 text-sm text-red-400">
          {authError}
        </div>
      ) : null}

      {isConnected && !authError ? (
        <p className="mt-3 text-xs text-[#666]">
          {hasActiveSession
            ? 'Session active. Open the dashboard to begin.'
            : connectorType === 'app'
              ? 'Sign the SIWE challenge to continue.'
              : 'Sign the SIWE challenge to start your session.'}
        </p>
      ) : null}
    </section>
  );
}
