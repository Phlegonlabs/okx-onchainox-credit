import { WalletConnectPanel } from '@/components/wallet/wallet-connect-panel';

const heroSignals = [
  {
    label: 'Chains observed',
    value: '60+',
    detail: 'Wallet, DeFi, and market telemetry normalized',
  },
  {
    label: 'Credential window',
    value: '30D',
    detail: 'ECDSA proof with explicit expiry and reuse',
  },
  {
    label: 'Enterprise access',
    value: 'x402',
    detail: 'Metered score queries for protocol-side underwriting',
  },
];

const deskRows = [
  ['Wallet tenure', '92 / 100'],
  ['Asset depth', '81 / 100'],
  ['Position stability', '76 / 100'],
  ['Repayment behavior', '88 / 100'],
  ['Multichain fluency', '69 / 100'],
];

export function LandingHero() {
  return (
    <section className="relative overflow-hidden rounded-[36px] border border-[var(--okx-border-light)] bg-[linear-gradient(180deg,rgba(12,18,32,0.94),rgba(8,12,20,0.84))] px-5 py-6 shadow-[0_30px_120px_rgba(0,0,0,0.45)] md:px-8 md:py-8">
      <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(245,166,35,0.8),transparent)]" />
      <div className="absolute -left-24 top-14 h-52 w-52 rounded-full bg-[rgba(245,166,35,0.12)] blur-3xl" />
      <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-[rgba(59,130,246,0.08)] blur-3xl" />

      <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.08fr)_400px]">
        <div className="flex flex-col gap-7">
          <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.24em] text-[var(--okx-text-muted)]">
            <span className="rounded-full border border-[var(--okx-border)] bg-[rgba(255,255,255,0.02)] px-3 py-1.5">
              Retail credential
            </span>
            <span className="rounded-full border border-[var(--okx-border)] bg-[rgba(255,255,255,0.02)] px-3 py-1.5">
              Enterprise score API
            </span>
            <span className="rounded-full border border-[var(--okx-border)] bg-[rgba(255,255,255,0.02)] px-3 py-1.5">
              x402 settlement on X Layer
            </span>
          </div>

          <div className="flex flex-col gap-7">
            <div className="space-y-5">
              <p className="animate-rise font-mono text-[11px] uppercase tracking-[0.34em] text-[var(--okx-text-muted)]">
                Underwrite what the wallet has already proven
              </p>
              <h1 className="animate-rise max-w-4xl text-5xl leading-[0.94] tracking-[-0.04em] text-balance text-[var(--color-foreground)] [font-family:var(--font-display)] md:text-7xl">
                A credit surface for wallets that already move like institutions.
              </h1>
              <p
                className="animate-rise max-w-2xl text-base leading-8 text-[var(--okx-text-muted)] md:text-lg"
                style={{ animationDelay: '120ms' }}
              >
                OKX OnchainOS Credit transforms live wallet history into a paid, lender-readable
                score surface, then seals the result as a verifiable credential protocols can trust
                without waiting on off-chain paperwork.
              </p>
            </div>

            <div
              className="animate-rise rounded-[28px] border border-[var(--okx-border)] bg-[rgba(255,255,255,0.03)] p-4 backdrop-blur-sm md:p-5"
              style={{ animationDelay: '180ms' }}
            >
              <div className="grid gap-4 md:grid-cols-3 md:divide-x md:divide-[rgba(36,51,82,0.7)]">
                {heroSignals.map((signal) => (
                  <article
                    className="space-y-3 md:px-4 first:md:pl-0 last:md:pr-0"
                    key={signal.label}
                  >
                    <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-[var(--okx-text-muted)]">
                      {signal.label}
                    </p>
                    <p className="text-3xl text-[var(--okx-accent-soft)] [font-family:var(--font-display)]">
                      {signal.value}
                    </p>
                    <p className="text-sm leading-6 text-[var(--okx-text-muted)]">
                      {signal.detail}
                    </p>
                  </article>
                ))}
              </div>
            </div>

            <div className="animate-rise grid gap-4 rounded-[28px] border border-[var(--okx-border)] bg-[linear-gradient(180deg,rgba(8,12,20,0.58),rgba(8,12,20,0.3))] p-5 md:grid-cols-[minmax(0,1fr)_160px]">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--okx-text-muted)]">
                  Live underwriting tape
                </p>
                <p className="mt-4 max-w-xl text-base leading-8 text-[var(--okx-text-muted)]">
                  The score surface is anchored in five dimensions, then exposed as one
                  lender-readable number. The desk does not need raw wallet traces to understand the
                  result.
                </p>
              </div>
              <div className="rounded-[24px] border border-[rgba(16,185,129,0.24)] bg-[rgba(16,185,129,0.08)] px-4 py-3 text-center">
                <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--okx-score-excellent)]">
                  Desk preview
                </p>
                <p className="mt-3 text-4xl [font-family:var(--font-display)]">742</p>
                <p className="mt-2 text-sm text-[var(--okx-text-muted)]">Prime tier sample</p>
              </div>
            </div>

            <div className="animate-rise rounded-[28px] border border-[var(--okx-border)] bg-[rgba(8,12,20,0.44)] p-5">
              <div className="grid gap-3 md:grid-cols-[repeat(5,minmax(0,1fr))]">
                {deskRows.map(([label, value]) => (
                  <div
                    className="border-b border-[rgba(36,51,82,0.55)] pb-3 md:border-b-0 md:border-r md:px-4 first:md:pl-0 last:border-none last:pb-0 last:md:pr-0"
                    key={label}
                  >
                    <p className="text-sm text-[var(--okx-text-muted)]">{label}</p>
                    <p className="mt-2 font-mono text-sm text-[var(--color-foreground)]">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <WalletConnectPanel />
      </div>
    </section>
  );
}
