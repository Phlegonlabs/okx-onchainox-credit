import { describe, expect, it } from 'vitest';
import {
  clampCreditScore,
  getGaugeProgress,
  getGaugeRotation,
  getTierTheme,
} from './dashboard-score';

describe('dashboard score helpers', () => {
  it('clamps scores into the 300-850 credit range', () => {
    expect(clampCreditScore(275)).toBe(300);
    expect(clampCreditScore(912)).toBe(850);
    expect(clampCreditScore(742.4)).toBe(742);
  });

  it('maps the score range to a normalized gauge progress', () => {
    expect(getGaugeProgress(300)).toBe(0);
    expect(getGaugeProgress(850)).toBe(1);
    expect(getGaugeProgress(575)).toBe(0.5);
  });

  it('maps the normalized progress to a 240 degree arc', () => {
    expect(getGaugeRotation(300)).toBe(-120);
    expect(getGaugeRotation(575)).toBe(0);
    expect(getGaugeRotation(850)).toBe(120);
  });

  it('returns a tier-specific visual theme', () => {
    expect(getTierTheme('excellent')).toMatchObject({ label: 'Excellent' });
    expect(getTierTheme('poor')).toMatchObject({ label: 'Poor' });
  });
});
