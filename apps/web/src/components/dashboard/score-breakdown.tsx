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
      <h3 className="border-b border-[var(--border-subtle)] pb-4 text-sm text-[var(--text-primary)]">
        Dimension Breakdown
      </h3>

      <div className="mt-4 grid gap-5">
        {entries.map((entry) => (
          <div key={entry.key}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-baseline gap-2">
                <span className="text-sm text-[var(--text-primary)]">{entry.label}</span>
                <span className="font-mono text-xs text-[var(--text-tertiary)]">
                  {Math.round(entry.weight * 100)}%
                </span>
              </div>
              <span className="font-mono text-sm text-[var(--text-primary)]">{entry.value}</span>
            </div>

            <div
              aria-label={`${entry.label} score ${entry.value} out of 100`}
              className="mt-2 h-1 overflow-hidden bg-[var(--border-subtle)]"
              role="meter"
            >
              <div
                className="h-full transition-all duration-700"
                style={{
                  backgroundColor: theme.accent,
                  width: `${entry.value}%`,
                }}
              />
            </div>

            <p className="mt-1.5 text-xs text-[var(--text-tertiary)]">{entry.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
