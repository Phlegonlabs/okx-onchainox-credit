import { describe, expect, it, vi } from 'vitest';
import { isLocalMockMode } from './local-integration';

describe('isLocalMockMode', () => {
  it('returns true in development when LOCAL_INTEGRATION_MODE=mock', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('LOCAL_INTEGRATION_MODE', 'mock');

    expect(isLocalMockMode()).toBe(true);
  });

  it('returns false when local mock mode is disabled', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('LOCAL_INTEGRATION_MODE', 'real');

    expect(isLocalMockMode()).toBe(false);
  });

  it('fails closed when production is configured to use local mock mode', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('LOCAL_INTEGRATION_MODE', 'mock');

    expect(() => isLocalMockMode()).toThrow(
      'LOCAL_INTEGRATION_MODE=mock is not allowed in production'
    );
  });
});
