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
      <div className="border-b border-[#2a2a2a] pb-4">
        <h3 className="text-base font-medium text-white">Dimension Breakdown</h3>
      </div>

      <div className="mt-4 grid gap-4">
        {entries.map((entry) => (
          <div
            className="border-b border-[#2a2a2a] pb-4 last:border-none last:pb-0"
            key={entry.key}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white">{entry.label}</span>
                  <span className="text-xs text-[#666]">{Math.round(entry.weight * 100)}%</span>
                </div>
                <p className="mt-1 text-sm text-[#666]">{entry.description}</p>
              </div>
              <span className="font-mono text-lg text-white">{entry.value}</span>
            </div>

            <div
              aria-label={`${entry.label} score ${entry.value} out of 100`}
              className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#2a2a2a]"
              role="meter"
            >
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  backgroundColor: theme.accent,
                  width: `${entry.value}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
