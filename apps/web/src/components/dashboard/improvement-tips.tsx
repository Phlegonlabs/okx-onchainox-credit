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
      <h3 className="border-b border-[var(--border-subtle)] pb-4 text-sm text-[var(--text-primary)]">
        Improvement Tips
      </h3>

      <div className="mt-4 grid gap-5">
        {tips.map((tip, index) => (
          <div
            className="border-b border-[var(--border-subtle)] pb-5 last:border-none last:pb-0"
            key={tip.dimensionKey}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="font-mono text-xs text-[var(--text-tertiary)]">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <p className="mt-1 text-sm text-[var(--text-primary)]">{tip.label}</p>
              </div>
              <span
                className="border px-2 py-0.5 font-mono text-xs"
                style={{
                  borderColor: `color-mix(in srgb, ${theme.accent} 25%, transparent)`,
                  color: theme.accent,
                }}
              >
                +{tip.estimatedPointGain}
              </span>
            </div>

            <p className="mt-2 text-sm leading-relaxed text-[var(--text-tertiary)]">
              {tip.summary}
            </p>

            <div className="mt-3 flex items-center gap-2 text-xs">
              <span className="text-[var(--text-tertiary)]">Current</span>
              <span className="font-mono text-[var(--text-secondary)]">{tip.currentValue}/100</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
