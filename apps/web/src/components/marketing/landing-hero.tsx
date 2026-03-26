import { WalletConnectPanel } from '@/components/wallet/wallet-connect-panel';

const stats = [
  { value: '60+', label: 'EVM chains scored' },
  { value: '30D', label: 'credential validity' },
  { value: 'x402', label: 'metered access' },
];

export function LandingHero() {
  return (
    <section className="grid gap-16 lg:grid-cols-[1fr_380px] lg:items-start lg:gap-20">
      <div className="max-w-xl">
        <div className="animate-enter">
          <p className="text-[13px] uppercase tracking-[0.2em] text-[var(--accent-gold)]">
            On-chain credit infrastructure
          </p>
          <h1 className="mt-5 font-display text-4xl leading-[1.08] tracking-tight text-[var(--text-primary)] md:text-[56px]">
            Credit scoring
            <br />
            <em className="text-[var(--text-secondary)]">for wallets</em>
          </h1>
          <p
            className="animate-enter mt-6 max-w-md text-base leading-relaxed text-[var(--text-secondary)]"
            style={{ animationDelay: '80ms' }}
          >
            FICO-equivalent 300-850 scores computed from on-chain history. ECDSA-signed credentials
            for DeFi protocols and enterprise underwriting.
          </p>
        </div>

        <div className="animate-enter mt-10 flex gap-10" style={{ animationDelay: '160ms' }}>
          {stats.map((stat) => (
            <div key={stat.label}>
              <p className="font-display text-2xl text-[var(--text-primary)]">{stat.value}</p>
              <p className="mt-1 text-xs text-[var(--text-tertiary)]">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="animate-enter" style={{ animationDelay: '200ms' }}>
        <WalletConnectPanel />
      </div>
    </section>
  );
}
