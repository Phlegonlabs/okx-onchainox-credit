const dimensions = [
  {
    name: 'Wallet Age & Activity',
    weight: 20,
    detail:
      'How long the wallet has been active and how frequently it transacts across a 48-month evaluation window.',
  },
  {
    name: 'Asset Scale',
    weight: 25,
    detail:
      'Portfolio value measured with recency-weighted historical pricing to prevent temporary pumps from inflating scores.',
  },
  {
    name: 'Position Stability',
    weight: 20,
    detail:
      'Duration of held positions and portfolio volatility, favoring long-term conviction over frequent trading.',
  },
  {
    name: 'DeFi Repayment',
    weight: 25,
    detail:
      'Borrow-repay ratio across lending protocols, with penalties for liquidation events. Covers Aave, Compound, Morpho, Spark.',
  },
  {
    name: 'Multi-chain Presence',
    weight: 10,
    detail: 'Number of distinct EVM chains with meaningful activity, reflecting ecosystem breadth.',
  },
];

export function LandingMethodology() {
  return (
    <section className="border-t border-[var(--border-subtle)] pt-16" id="credit-method">
      <div className="animate-enter max-w-lg">
        <p className="text-[13px] uppercase tracking-[0.2em] text-[var(--accent-gold)]">
          Methodology
        </p>
        <h2 className="mt-4 font-display text-3xl tracking-tight text-[var(--text-primary)] md:text-4xl">
          Five dimensions of on-chain credit
        </h2>
        <p
          className="animate-enter mt-4 text-base leading-relaxed text-[var(--text-secondary)]"
          style={{ animationDelay: '80ms' }}
        >
          Each dimension scores 0-100, weighted and mapped to a 300-850 FICO-equivalent range.
        </p>
      </div>

      <div className="animate-enter mt-12 grid gap-0" style={{ animationDelay: '160ms' }}>
        {dimensions.map((dim, index) => (
          <div
            className="grid items-baseline gap-4 border-t border-[var(--border-subtle)] py-6 sm:grid-cols-[40px_200px_1fr]"
            key={dim.name}
          >
            <span className="font-mono text-sm text-[var(--text-tertiary)]">
              {String(index + 1).padStart(2, '0')}
            </span>
            <div className="flex items-baseline gap-3">
              <span className="text-sm text-[var(--text-primary)]">{dim.name}</span>
              <span className="font-mono text-xs text-[var(--accent-gold)]">{dim.weight}%</span>
            </div>
            <p className="text-sm leading-relaxed text-[var(--text-tertiary)]">{dim.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
