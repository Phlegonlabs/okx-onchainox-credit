import { describe, expect, it } from 'vitest';
import { getHealthStatusPayload } from './health';

describe('getHealthStatusPayload', () => {
  it('returns the versioned health snapshot with integer uptime', () => {
    expect(getHealthStatusPayload(() => 42.9, '0.1.0')).toEqual({
      status: 'ok',
      uptime: 42,
      version: '0.1.0',
    });
  });
});
