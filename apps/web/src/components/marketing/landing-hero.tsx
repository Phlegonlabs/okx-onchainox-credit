import { WalletConnectPanel } from '@/components/wallet/wallet-connect-panel';

const features = [
  { label: '60+ chains', detail: 'Multi-chain wallet analysis' },
  { label: '30D credential', detail: 'ECDSA signed proof with expiry' },
  { label: 'x402 metered', detail: 'Pay-per-query enterprise API' },
];

export function LandingHero() {
  return (
    <section className="grid gap-12 lg:grid-cols-[minmax(0,1.1fr)_400px] lg:gap-16">
      <div className="flex flex-col gap-8">
        <div className="space-y-4">
          <h1 className="animate-rise text-4xl font-medium leading-[1.1] tracking-tight text-white md:text-6xl">
            On-chain credit scoring for wallets.
          </h1>
          <p
            className="animate-rise max-w-xl text-base leading-relaxed text-[#888] md:text-lg"
            style={{ animationDelay: '80ms' }}
          >
            Transform wallet history into a 300-850 credit score with verifiable credentials
            protocols can trust.
          </p>
        </div>

        <div className="animate-rise grid gap-3 sm:grid-cols-3" style={{ animationDelay: '160ms' }}>
          {features.map((feature) => (
            <div
              className="rounded-lg border border-[#2a2a2a] bg-[#0a0a0a] p-4"
              key={feature.label}
            >
              <p className="text-sm font-medium text-white">{feature.label}</p>
              <p className="mt-1 text-sm text-[#666]">{feature.detail}</p>
            </div>
          ))}
        </div>
      </div>

      <WalletConnectPanel />
    </section>
  );
}
