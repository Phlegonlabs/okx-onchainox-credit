import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolveMainRoot } from './worktree.js';

describe('resolveMainRoot', () => {
  it('uses the git common dir when running inside a worktree', () => {
    expect(
      resolveMainRoot(
        'C:/Users/mps19/Documents/Github/okx-onchainox-credit-M1',
        'C:/Users/mps19/Documents/Github/okx-onchainox-credit/.git'
      )
    ).toBe(resolve('C:/Users/mps19/Documents/Github/okx-onchainox-credit'));
  });

  it('falls back to the current top-level when git common dir is local', () => {
    expect(
      resolveMainRoot(
        'C:/Users/mps19/Documents/Github/okx-onchainox-credit',
        '.git'
      )
    ).toBe('C:/Users/mps19/Documents/Github/okx-onchainox-credit');
  });
});
