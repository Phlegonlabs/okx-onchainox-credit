import { WalletConnectPanel } from '@/components/wallet/wallet-connect-panel';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(245,166,35,0.16),transparent_24%),linear-gradient(180deg,#0b111b_0%,#080c14_55%,#060910_100%)] px-6 py-12 text-[var(--color-foreground)] md:px-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-10">
        <header className="flex flex-col gap-4 border-b border-[var(--okx-border)] pb-8">
          <p className="font-mono text-xs uppercase tracking-[0.38em] text-[var(--okx-accent)]">
            OKX OnchainOS Credit
          </p>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-3">
              <h1 className="max-w-3xl text-5xl font-semibold leading-tight tracking-tight md:text-6xl">
                On-chain credit infrastructure for wallets that already live across chains.
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-[var(--okx-text-muted)]">
                This milestone wires wallet connectivity into the app shell so SIWE, scoring, and
                x402 issuance can layer on top of a real account context next.
              </p>
            </div>
            <div className="rounded-full border border-[var(--okx-border)] px-4 py-2 font-mono text-xs uppercase tracking-[0.26em] text-[var(--okx-text-muted)]">
              WalletConnect + viem
            </div>
          </div>
        </header>

        <WalletConnectPanel />
      </div>
    </main>
  );
}
