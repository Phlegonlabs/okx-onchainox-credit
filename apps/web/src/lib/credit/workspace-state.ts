export type ScoreWorkspaceState =
  | 'no_target'
  | 'target_locked'
  | 'payment_required'
  | 'settling'
  | 'unlocked'
  | 'error';

export function resolveScoreWorkspaceState(input: {
  errorMessage: string | null;
  hasPaymentRequired: boolean;
  hasScore: boolean;
  isSubmitting: boolean;
  targetWallet: string | null;
}): ScoreWorkspaceState {
  if (!input.targetWallet) {
    return 'no_target';
  }

  if (input.hasScore) {
    return 'unlocked';
  }

  if (input.isSubmitting) {
    return 'settling';
  }

  if (input.hasPaymentRequired) {
    return 'payment_required';
  }

  if (input.errorMessage) {
    return 'error';
  }

  return 'target_locked';
}
