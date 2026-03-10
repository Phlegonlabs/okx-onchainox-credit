import { getImprovementTips, getTierTheme } from '@/lib/credit/dashboard-score';
import type { ScoreDimensions, ScoreTier } from '@okx-credit/scoring';

export function ImprovementTips({
  dimensions,
  tier,
}: {
  dimensions: ScoreDimensions;
  tier: ScoreTier;
}) {
  const theme = getTierTheme(tier);
  const tips = getImprovementTips(dimensions);

  return (
    <section className="rounded-[28px] border border-[var(--okx-border)] bg-[rgba(12,18,32,0.84)] p-5 md:p-6">
      <div className="flex flex-col gap-3 border-b border-[var(--okx-border)] pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--okx-text-muted)]">
            Improvement queue
          </p>
          <h2 className="mt-3 text-3xl tracking-[-0.04em] text-balance [font-family:var(--font-display)] md:text-4xl">
            The fastest available ways to move the score upward.
          </h2>
        </div>

        <div
          className="self-start rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-[0.24em]"
          style={{
            borderColor: theme.glow,
            color: theme.accent,
          }}
        >
          Ranked by estimated point gain
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {tips.map((tip, index) => (
          <article
            className="min-w-0 rounded-[24px] border border-[rgba(36,51,82,0.72)] bg-[rgba(255,255,255,0.02)] p-5"
            key={tip.dimensionKey}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--okx-text-dim)]">
                  Priority 0{index + 1}
                </p>
                <h3 className="mt-3 text-2xl tracking-[-0.03em] [font-family:var(--font-display)]">
                  {tip.label}
                </h3>
              </div>
              <div
                className="self-start rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-[0.22em]"
                style={{
                  borderColor: theme.glow,
                  color: theme.accent,
                }}
              >
                +{tip.estimatedPointGain} pts
              </div>
            </div>

            <p className="mt-4 text-sm leading-7 text-[var(--okx-text-muted)]">{tip.summary}</p>

            <div className="mt-5 rounded-[20px] border border-[var(--okx-border)] bg-[rgba(255,255,255,0.02)] px-4 py-3">
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--okx-text-dim)]">
                Current dimension score
              </p>
              <p className="mt-3 text-3xl [font-family:var(--font-display)]">{tip.currentValue}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
