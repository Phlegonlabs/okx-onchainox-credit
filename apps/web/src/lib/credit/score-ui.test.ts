import { describe, expect, it } from 'vitest';
import { getScoreActionMessage } from './score-ui';

describe('getScoreActionMessage', () => {
  it('maps known paid score API errors to actionable copy', () => {
    expect(
      getScoreActionMessage({
        code: 'RATE_LIMITED',
        message: 'Enterprise API rate limit exceeded.',
      })
    ).toBe(
      'This payer hit the score query limit. Wait for the retry window, then resubmit the receipt.'
    );
  });

  it('falls back to a generic paid score message for unknown errors', () => {
    expect(
      getScoreActionMessage({
        code: 'SOMETHING_NEW',
        message: 'Unknown failure',
      })
    ).toBe('Paid score retrieval is temporarily unavailable. Retry in a moment.');
  });
});
