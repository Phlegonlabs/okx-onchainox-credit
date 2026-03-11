import { describe, expect, it } from 'vitest';
import { formatIsoDateTimeUtc, formatIsoDateUtc, formatUnixDateTimeUtc } from './date-format';

describe('date formatting', () => {
  it('formats ISO dates in stable UTC form', () => {
    expect(formatIsoDateUtc('2026-03-11T13:04:16.350Z')).toBe('Mar 11, 2026');
  });

  it('formats ISO date-times in stable UTC form', () => {
    expect(formatIsoDateTimeUtc('2026-03-11T13:04:16.350Z')).toBe('Mar 11, 2026 13:04 UTC');
  });

  it('formats unix timestamps in stable UTC form', () => {
    expect(formatUnixDateTimeUtc(Date.parse('2026-03-11T13:04:00.000Z') / 1_000)).toBe(
      'Mar 11, 2026 13:04 UTC'
    );
  });
});
