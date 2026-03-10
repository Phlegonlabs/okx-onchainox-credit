import { WalletConnectPanel } from '@/components/wallet/wallet-connect-panel';

const heroSignals = [
  { label: 'Chains Observed', value: '60+', detail: 'Wallet + DeFi + market telemetry' },
  { label: 'Credential Window', value: '30D', detail: 'ECDSA proof with explicit expiry' },
  { label: 'Enterprise Access', value: 'x402', detail: 'Paid API for protocol-side lookups' },
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
    <section className="relative overflow-hidden rounded-[32px] border border-[var(--okx-border-light)] bg-[linear-gradient(180deg,rgba(12,18,32,0.94),rgba(8,12,20,0.84))] p-5 shadow-[0_30px_120px_rgba(0,0,0,0.45)] md:p-8">
      <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(245,166,35,0.8),transparent)]" />
      <div className="absolute -left-24 top-14 h-52 w-52 rounded-full bg-[rgba(245,166,35,0.12)] blur-3xl" />
      <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-[rgba(59,130,246,0.08)] blur-3xl" />

      <div className="relative flex flex-col gap-10">
        <div className="flex flex-col gap-5 border-b border-[var(--okx-border)] pb-8 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <p className="font-mono text-[11px] uppercase tracking-[0.42em] text-[var(--okx-accent)]">
              OKX OnchainOS Credit
            </p>
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
          </div>

          <div className="grid gap-2 text-right font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--okx-text-dim)] md:text-[12px]">
            <span>Wallet identity, not email identity</span>
            <span>Credit decisions sourced from chain behavior</span>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_420px]">
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
                OKX OnchainOS Credit transforms live wallet history into a FICO-equivalent score,
                then seals it as a verifiable credential protocols can trust without waiting on
                off-chain paperwork.
              </p>
            </div>

            <div
              className="animate-rise grid gap-4 md:grid-cols-3"
              style={{ animationDelay: '180ms' }}
            >
              {heroSignals.map((signal) => (
                <article
                  className="rounded-[24px] border border-[var(--okx-border)] bg-[rgba(255,255,255,0.03)] p-4 backdrop-blur-sm"
                  key={signal.label}
                >
                  <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-[var(--okx-text-muted)]">
                    {signal.label}
                  </p>
                  <p className="mt-4 text-3xl text-[var(--okx-accent-soft)] [font-family:var(--font-display)]">
                    {signal.value}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-[var(--okx-text-muted)]">
                    {signal.detail}
                  </p>
                </article>
              ))}
            </div>
          </div>

          <div className="grid gap-4">
            <WalletConnectPanel />

            <aside className="animate-rise rounded-[28px] border border-[var(--okx-border)] bg-[linear-gradient(180deg,rgba(8,12,20,0.72),rgba(8,12,20,0.92))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <div className="flex items-center justify-between gap-3 border-b border-[var(--okx-border)] pb-4">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--okx-text-muted)]">
                    Credit desk preview
                  </p>
                  <p className="mt-2 text-2xl [font-family:var(--font-display)] md:text-3xl">742</p>
                </div>
                <div className="rounded-full border border-[rgba(16,185,129,0.24)] bg-[rgba(16,185,129,0.12)] px-3 py-1 font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--okx-score-excellent)]">
                  Prime tier
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {deskRows.map(([label, value]) => (
                  <div
                    className="flex items-center justify-between gap-4 border-b border-[rgba(36,51,82,0.55)] pb-3 last:border-none last:pb-0"
                    key={label}
                  >
                    <span className="text-sm text-[var(--okx-text-muted)]">{label}</span>
                    <span className="font-mono text-sm text-[var(--color-foreground)]">
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </div>
      </div>
    </section>
  );
}
