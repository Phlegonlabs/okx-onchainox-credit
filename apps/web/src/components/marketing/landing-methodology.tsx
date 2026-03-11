const dimensions = [
  {
    name: 'Wallet Age & Activity',
    weight: '20%',
    description:
      'Account tenure + transaction frequency — the on-chain equivalent of credit history length.',
  },
  {
    name: 'Asset Scale',
    weight: '25%',
    description: 'Portfolio value across chains — demonstrates capacity to service obligations.',
  },
  {
    name: 'Position Stability',
    weight: '20%',
    description: 'Holding duration and low volatility — signals conviction, not speculation.',
  },
  {
    name: 'DeFi Repayment',
    weight: '25%',
    description:
      'Borrow/repay behavior and liquidation history — the closest analog to traditional payment history.',
  },
  {
    name: 'Multi-chain Presence',
    weight: '10%',
    description: 'Activity across 60+ chains — diversification reduces single-chain risk.',
  },
];

export function LandingMethodology() {
  return (
    <section className="border-t border-[#2a2a2a] pt-12">
      <div className="space-y-3">
        <h2 className="animate-rise text-2xl font-medium tracking-tight text-white md:text-3xl">
          Why these five dimensions
        </h2>
        <p
          className="animate-rise max-w-2xl text-sm leading-relaxed text-[#888]"
          style={{ animationDelay: '80ms' }}
        >
          Traditional credit uses payment history, utilization, and account age. On-chain credit
          maps equivalent signals from wallet data into a 300–850 FICO-equivalent score.
        </p>
      </div>

      <div
        className="animate-rise mt-8 grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5"
        style={{ animationDelay: '160ms' }}
      >
        {dimensions.map((dim) => (
          <div className="rounded-lg border border-[#2a2a2a] bg-[#0a0a0a] p-5" key={dim.name}>
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-white">{dim.name}</p>
              <span className="shrink-0 rounded border border-[#2a2a2a] px-1.5 py-0.5 text-xs text-[#666]">
                {dim.weight}
              </span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-[#888]">{dim.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
