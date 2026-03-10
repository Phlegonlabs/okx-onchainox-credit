import { describe, expect, it, vi } from 'vitest';
import { GET } from './route';

const { getHealthStatusPayload } = vi.hoisted(() => ({
  getHealthStatusPayload: vi.fn(),
}));

vi.mock('@/lib/health', () => ({
  getHealthStatusPayload,
}));

describe('GET /api/health', () => {
  it('returns the health payload without caching', async () => {
    getHealthStatusPayload.mockReturnValue({
      status: 'ok',
      uptime: 42,
      version: '0.1.0',
    });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    await expect(response.json()).resolves.toEqual({
      status: 'ok',
      uptime: 42,
      version: '0.1.0',
    });
  });
});
