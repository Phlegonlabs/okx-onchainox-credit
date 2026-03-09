import { afterEach, beforeEach, vi } from 'vitest';

const BASE_ENV = { ...process.env };

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();

  for (const key of Object.keys(process.env)) {
    if (!(key in BASE_ENV)) {
      delete process.env[key];
    }
  }

  Object.assign(process.env, BASE_ENV);
});
