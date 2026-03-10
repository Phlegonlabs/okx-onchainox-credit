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
          <button
            className="rounded-[24px] border border-[var(--okx-border-light)] bg-[var(--okx-accent)] px-5 py-4 text-sm font-semibold text-[#080c14] transition hover:bg-[#ffb84d]"
            onClick={() => disconnect()}
            type="button"
          >
            Disconnect
          </button>
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
    </section>
  );
}
