'use client';

import {
  clampCreditScore,
  getGaugeProgress,
  getGaugeRotation,
  getTierTheme,
} from '@/lib/credit/dashboard-score';
import type { ScoreTier } from '@graxis/scoring';
import { useEffect, useMemo, useState } from 'react';

const ARC_LENGTH = 402;
const ARC_RADIUS = 86;
const ARC_STROKE = 8;
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
      className="grid gap-5"
      role="img"
    >
      <div className="relative mx-auto flex h-[200px] w-[200px] items-center justify-center md:h-[220px] md:w-[220px]">
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
            opacity="0.2"
            r={ARC_RADIUS}
            stroke="var(--border-default)"
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
              transition: 'stroke-dasharray 1200ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          />
        </svg>

        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            transform: `rotate(${needleRotation}deg)`,
            transition: 'transform 1200ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <div className="mt-[-86px] h-14 w-px" style={{ backgroundColor: theme.accent }} />
          <div
            className="absolute h-2.5 w-2.5 rounded-full"
            style={{
              backgroundColor: theme.accent,
              boxShadow: `0 0 12px ${theme.accent}40`,
            }}
          />
        </div>

        <div className="relative text-center">
          <p className="font-display text-6xl leading-none tracking-tight text-[var(--text-primary)] md:text-7xl">
            {animatedScore}
          </p>
          <p
            className="mt-2 text-[11px] uppercase tracking-[0.25em]"
            style={{ color: theme.accent }}
          >
            {theme.label}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center font-mono text-[11px] text-[var(--text-tertiary)]">
        <span>300</span>
        <span>575</span>
        <span>850</span>
      </div>
    </div>
  );
}
