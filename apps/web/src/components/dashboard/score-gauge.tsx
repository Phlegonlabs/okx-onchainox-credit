'use client';

import {
  clampCreditScore,
  getGaugeProgress,
  getGaugeRotation,
  getTierTheme,
} from '@/lib/credit/dashboard-score';
import type { ScoreTier } from '@okx-credit/scoring';
import { useEffect, useMemo, useState } from 'react';

const ARC_LENGTH = 402;
const ARC_RADIUS = 86;
const ARC_STROKE = 12;
const SCORE_FLOOR = 300;

export function ScoreGauge({
  score,
  tier,
}: {
  score: number;
  tier: ScoreTier;
}) {
  const clampedScore = clampCreditScore(score);
  const theme = getTierTheme(tier);
  const targetProgress = getGaugeProgress(clampedScore);
  const [animatedScore, setAnimatedScore] = useState(SCORE_FLOOR);
  const [animatedProgress, setAnimatedProgress] = useState(0);

  useEffect(() => {
    const animationId = window.requestAnimationFrame(() => {
      setAnimatedScore(clampedScore);
      setAnimatedProgress(targetProgress);
    });

    return () => window.cancelAnimationFrame(animationId);
  }, [clampedScore, targetProgress]);

  const progressLength = useMemo(
    () => Math.max(14, ARC_LENGTH * animatedProgress),
    [animatedProgress]
  );
  const needleRotation = useMemo(() => getGaugeRotation(animatedScore), [animatedScore]);

  return (
    <div
      aria-label={`Credit score ${clampedScore} in ${theme.label.toLowerCase()} tier`}
      className="grid gap-6"
      role="img"
    >
      <div className="relative mx-auto flex h-[250px] w-[250px] items-center justify-center">
        <div
          className="absolute inset-7 rounded-full blur-3xl"
          style={{
            background: `radial-gradient(circle, ${theme.glow} 0%, transparent 70%)`,
          }}
        />

        <svg
          aria-hidden="true"
          className="absolute inset-0 h-full w-full -rotate-[120deg]"
          viewBox="0 0 220 220"
        >
          <title>{`Credit gauge for score ${clampedScore}`}</title>
          <circle
            cx="110"
            cy="110"
            fill="none"
            opacity="0.4"
            r={ARC_RADIUS}
            stroke="rgba(36,51,82,0.7)"
            strokeDasharray={`${ARC_LENGTH} 540`}
            strokeLinecap="round"
            strokeWidth={ARC_STROKE}
          />
          <circle
            cx="110"
            cy="110"
            fill="none"
            r={ARC_RADIUS}
            stroke={theme.accent}
            strokeDasharray={`${progressLength} 540`}
            strokeLinecap="round"
            strokeWidth={ARC_STROKE}
            style={{
              filter: `drop-shadow(0 0 18px ${theme.glow})`,
              transition: 'stroke-dasharray 1100ms cubic-bezier(0.2, 1, 0.22, 1)',
            }}
          />
        </svg>

        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            transform: `rotate(${needleRotation}deg)`,
            transition: 'transform 1100ms cubic-bezier(0.2, 1, 0.22, 1)',
          }}
        >
          <div
            className="mt-[-86px] h-20 w-0.5 rounded-full"
            style={{ backgroundColor: theme.accent }}
          />
          <div
            className="absolute h-4 w-4 rounded-full border-4 border-[rgba(8,12,20,0.9)]"
            style={{ backgroundColor: theme.accent }}
          />
        </div>

        <div className="relative text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[var(--okx-text-muted)]">
            Current score
          </p>
          <p className="mt-4 text-7xl leading-none tracking-[-0.05em] [font-family:var(--font-display)]">
            {animatedScore}
          </p>
          <p className="mt-3 text-sm uppercase tracking-[0.24em]" style={{ color: theme.accent }}>
            {theme.label}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--okx-text-dim)]">
        <span>300 Base</span>
        <span>575 Median</span>
        <span>850 Prime</span>
      </div>

      <div className="rounded-[22px] border border-[rgba(36,51,82,0.72)] bg-[rgba(255,255,255,0.02)] px-4 py-3 text-sm leading-7 text-[var(--okx-text-muted)]">
        The gauge tracks the normalized 300-850 credit surface and lights in the current tier color.
      </div>
    </div>
  );
}
