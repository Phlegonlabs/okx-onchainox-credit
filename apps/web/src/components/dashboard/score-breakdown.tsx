import { getDimensionEntries, getTierTheme } from '@/lib/credit/dashboard-score';
import type { ScoreDimensions, ScoreTier } from '@okx-credit/scoring';

export function ScoreBreakdown({
  dimensions,
  tier,
}: {
  dimensions: ScoreDimensions;
  tier: ScoreTier;
}) {
  const theme = getTierTheme(tier);
  const entries = getDimensionEntries(dimensions);

  return (
    <div className="min-w-0">
      <div className="flex flex-col gap-3 border-b border-[rgba(36,51,82,0.72)] pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--okx-text-muted)]">
            Dimension breakdown
          </p>
          <h2 className="mt-3 text-3xl tracking-[-0.04em] text-balance [font-family:var(--font-display)]">
            Five underwriting inputs, normalized into one credit surface.
          </h2>
        </div>

        <div
          className="self-start rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-[0.24em]"
          style={{
            borderColor: theme.glow,
            color: theme.accent,
          }}
        >
          Color keyed to {theme.label.toLowerCase()} tier
        </div>
      </div>

      <div className="mt-6 grid gap-4">
        {entries.map((entry) => (
          <article
            className="border-b border-[rgba(36,51,82,0.72)] pb-4 last:border-none last:pb-0"
            key={entry.key}
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-2xl tracking-[-0.03em] [font-family:var(--font-display)]">
                    {entry.label}
                  </h3>
                  <span className="rounded-full border border-[var(--okx-border)] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--okx-text-dim)]">
                    {Math.round(entry.weight * 100)}% weight
                  </span>
                </div>
                <p className="mt-2 text-sm leading-7 text-[var(--okx-text-muted)]">
                  {entry.description}
                </p>
              </div>

              <div className="rounded-[20px] border border-[rgba(36,51,82,0.72)] bg-[rgba(255,255,255,0.03)] px-4 py-3 font-mono md:text-right">
                <p className="text-3xl text-[var(--color-foreground)]">{entry.value}</p>
                <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--okx-text-dim)]">
                  out of 100
                </p>
              </div>
            </div>

            <div
              aria-label={`${entry.label} score ${entry.value} out of 100`}
              className="mt-4 h-3 overflow-hidden rounded-full bg-[rgba(26,37,64,0.85)]"
              role="meter"
            >
              <div
                className="h-full rounded-full"
                style={{
                  background: `linear-gradient(90deg, ${theme.accent}, rgba(255,255,255,0.92))`,
                  boxShadow: `0 0 18px ${theme.glow}`,
                  width: `${entry.value}%`,
                }}
              />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
