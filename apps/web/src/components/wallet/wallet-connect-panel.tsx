'use client';

import { useAccount, useConnect, useDisconnect } from 'wagmi';

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function WalletConnectPanel() {
  const { address, chain, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  return (
    <section className="relative overflow-hidden rounded-3xl border border-[var(--okx-border-light)] bg-[linear-gradient(145deg,rgba(13,20,32,0.95),rgba(8,12,20,0.98))] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
      <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(245,166,35,0.65),transparent)]" />
      <div className="mb-8 flex items-start justify-between gap-6">
        <div className="space-y-3">
          <p className="font-mono text-xs uppercase tracking-[0.35em] text-[var(--okx-text-muted)]">
            Wallet Session
          </p>
          <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-[var(--color-foreground)]">
            Connect an EVM wallet to start the on-chain credit flow.
          </h1>
          <p className="max-w-lg text-sm leading-7 text-[var(--okx-text-muted)]">
            Wagmi and viem are wired into the app context. Once connected, the wallet address and
            chain state are available to all client components.
          </p>
        </div>
        <div className="hidden rounded-full border border-[var(--okx-border)] bg-[rgba(245,166,35,0.08)] px-4 py-2 font-mono text-xs uppercase tracking-[0.25em] text-[var(--okx-accent)] md:block">
          M1-006
        </div>
      </div>

      {isConnected && address ? (
        <div className="grid gap-4 md:grid-cols-[1.4fr_0.6fr]">
          <div className="rounded-2xl border border-[var(--okx-border)] bg-[rgba(17,24,39,0.72)] p-5">
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-[var(--okx-text-muted)]">
              Connected Wallet
            </p>
            <p className="mt-4 font-mono text-2xl text-[var(--color-foreground)]" title={address}>
              {truncateAddress(address)}
            </p>
            <p className="mt-2 text-sm text-[var(--okx-text-muted)]">
              {chain ? `${chain.name} · chain ${chain.id}` : 'Chain pending'}
            </p>
          </div>
          <button
            className="rounded-2xl border border-[var(--okx-border-light)] bg-[var(--okx-accent)] px-5 py-4 text-sm font-semibold text-[#080c14] transition hover:bg-[#ffb84d]"
            onClick={() => disconnect()}
            type="button"
          >
            Disconnect
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {connectors.map((connector) => (
            <button
              className="group rounded-2xl border border-[var(--okx-border)] bg-[rgba(17,24,39,0.72)] p-5 text-left transition hover:border-[var(--okx-accent)] hover:bg-[rgba(245,166,35,0.06)] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!connector.ready || isPending}
              key={connector.uid}
              onClick={() => connect({ connector })}
              type="button"
            >
              <p className="font-mono text-xs uppercase tracking-[0.28em] text-[var(--okx-text-muted)]">
                {connector.type === 'injected' ? 'Browser Wallet' : 'WalletConnect'}
              </p>
              <p className="mt-3 text-xl font-semibold text-[var(--color-foreground)]">
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
    </section>
  );
}
