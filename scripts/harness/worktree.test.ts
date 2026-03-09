import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getMilestoneWorktreePath, resolveMainRoot } from './worktree.js';

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

describe('getMilestoneWorktreePath', () => {
  it('builds sibling worktree paths on Windows-style roots', () => {
    expect(
      getMilestoneWorktreePath(
        'M2',
        'C:\\Users\\mps19\\Documents\\Github\\okx-onchainox-credit'
      )
    ).toBe(
      resolve('C:/Users/mps19/Documents/Github/okx-onchainox-credit-M2')
    );
  });
});
