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
    <div className="min-w-0">
      <div className="border-b border-[#2a2a2a] pb-4">
        <h3 className="text-base font-medium text-white">Improvement Tips</h3>
      </div>

      <div className="mt-4 grid gap-4">
        {tips.map((tip, index) => (
          <div
            className="border-b border-[#2a2a2a] pb-4 last:border-none last:pb-0"
            key={tip.dimensionKey}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-[#666]">#{index + 1}</p>
                <p className="mt-1 text-sm font-medium text-white">{tip.label}</p>
              </div>
              <span
                className="rounded-md border px-2 py-0.5 text-xs"
                style={{
                  borderColor: `color-mix(in srgb, ${theme.accent} 30%, transparent)`,
                  color: theme.accent,
                }}
              >
                +{tip.estimatedPointGain} pts
              </span>
            </div>

            <p className="mt-2 text-sm text-[#888]">{tip.summary}</p>

            <div className="mt-3 rounded-md border border-[#2a2a2a] bg-black px-3 py-2">
              <span className="text-xs text-[#666]">Current: </span>
              <span className="font-mono text-sm text-white">{tip.currentValue}/100</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
