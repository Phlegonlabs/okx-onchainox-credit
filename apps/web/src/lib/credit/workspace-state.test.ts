import { describe, expect, it } from 'vitest';
import { resolveScoreWorkspaceState } from './workspace-state';

describe('resolveScoreWorkspaceState', () => {
  it('returns no_target when no wallet is locked', () => {
    expect(
      resolveScoreWorkspaceState({
        errorMessage: null,
        hasPaymentRequired: false,
        hasScore: false,
        isSubmitting: false,
        targetWallet: null,
      })
    ).toBe('no_target');
  });

  it('returns unlocked when score data is available', () => {
    expect(
      resolveScoreWorkspaceState({
        errorMessage: null,
        hasPaymentRequired: true,
        hasScore: true,
        isSubmitting: false,
        targetWallet: '0x1234567890AbcdEF1234567890aBcdef12345678',
      })
    ).toBe('unlocked');
  });

  it('returns settling while a request is in flight', () => {
    expect(
      resolveScoreWorkspaceState({
        errorMessage: null,
        hasPaymentRequired: true,
        hasScore: false,
        isSubmitting: true,
        targetWallet: '0x1234567890AbcdEF1234567890aBcdef12345678',
      })
    ).toBe('settling');
  });

  it('returns payment_required when quote details are available', () => {
    expect(
      resolveScoreWorkspaceState({
        errorMessage: null,
        hasPaymentRequired: true,
        hasScore: false,
        isSubmitting: false,
        targetWallet: '0x1234567890AbcdEF1234567890aBcdef12345678',
      })
    ).toBe('payment_required');
  });

  it('returns error when no quote is active but the latest request failed', () => {
    expect(
      resolveScoreWorkspaceState({
        errorMessage: 'Request failed.',
        hasPaymentRequired: false,
        hasScore: false,
        isSubmitting: false,
        targetWallet: '0x1234567890AbcdEF1234567890aBcdef12345678',
      })
    ).toBe('error');
  });

  it('returns target_locked once a valid target is selected', () => {
    expect(
      resolveScoreWorkspaceState({
        errorMessage: null,
        hasPaymentRequired: false,
        hasScore: false,
        isSubmitting: false,
        targetWallet: '0x1234567890AbcdEF1234567890aBcdef12345678',
      })
    ).toBe('target_locked');
  });
});
