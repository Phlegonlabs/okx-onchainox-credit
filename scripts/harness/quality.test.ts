import { describe, expect, it } from 'vitest';
import { getChangelogRange } from './quality.js';

describe('getChangelogRange', () => {
  it('returns explicit ranges when refs are provided', () => {
    expect(getChangelogRange('abc123', 'def456')).toBe('abc123..def456');
    expect(getChangelogRange('abc123')).toBe('abc123..HEAD');
  });

  it('omits the range for short-history default logs', () => {
    expect(getChangelogRange()).toBeNull();
  });
});
