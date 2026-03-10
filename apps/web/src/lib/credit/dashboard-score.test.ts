import { describe, expect, it } from 'vitest';
import {
  clampCreditScore,
  getDimensionEntries,
  getGaugeProgress,
  getGaugeRotation,
  getImprovementTips,
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

  it('returns ordered score dimension entries with labels and values', () => {
    expect(
      getDimensionEntries({
        walletAge: 71,
        assetScale: 82,
        positionStability: 63,
        repaymentHistory: 90,
        multichain: 44,
      })
    ).toEqual([
      expect.objectContaining({ key: 'walletAge', label: 'Wallet age', value: 71 }),
      expect.objectContaining({ key: 'assetScale', label: 'Asset scale', value: 82 }),
      expect.objectContaining({ key: 'positionStability', label: 'Position stability', value: 63 }),
      expect.objectContaining({ key: 'repaymentHistory', label: 'Repayment history', value: 90 }),
      expect.objectContaining({ key: 'multichain', label: 'Multichain activity', value: 44 }),
    ]);
  });

  it('ranks improvement tips by estimated point gain', () => {
    expect(
      getImprovementTips({
        walletAge: 72,
        assetScale: 61,
        positionStability: 58,
        repaymentHistory: 35,
        multichain: 42,
      })
    ).toEqual([
      expect.objectContaining({ dimensionKey: 'repaymentHistory', estimatedPointGain: 89 }),
      expect.objectContaining({ dimensionKey: 'assetScale', estimatedPointGain: 54 }),
      expect.objectContaining({ dimensionKey: 'positionStability', estimatedPointGain: 46 }),
    ]);
  });
});
