import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  getMilestoneWorktreePath,
  isCurrentWorktreePath,
  resolveMainRoot,
} from './worktree.js';

describe('resolveMainRoot', () => {
  it('uses the git common dir when running inside a worktree', () => {
    expect(
      resolveMainRoot(
        'C:/Users/mps19/Documents/Github/graxis-M1',
        'C:/Users/mps19/Documents/Github/graxis/.git'
      )
    ).toBe(resolve('C:/Users/mps19/Documents/Github/graxis'));
  });

  it('falls back to the current top-level when git common dir is local', () => {
    expect(
      resolveMainRoot(
        'C:/Users/mps19/Documents/Github/graxis',
        '.git'
      )
    ).toBe('C:/Users/mps19/Documents/Github/graxis');
  });
});

describe('getMilestoneWorktreePath', () => {
  it('builds sibling worktree paths on Windows-style roots', () => {
    expect(
      getMilestoneWorktreePath(
        'M2',
        'C:\\Users\\mps19\\Documents\\Github\\graxis'
      )
    ).toBe(
      resolve('C:/Users/mps19/Documents/Github/graxis-M2')
    );
  });
});

describe('isCurrentWorktreePath', () => {
  it('detects when the cwd matches the worktree root', () => {
    expect(
      isCurrentWorktreePath(
        'C:\\Users\\mps19\\Documents\\Github\\graxis-M2',
        'C:\\Users\\mps19\\Documents\\Github\\graxis-M2'
      )
    ).toBe(true);
  });

  it('detects when the cwd is inside the worktree', () => {
    expect(
      isCurrentWorktreePath(
        'C:\\Users\\mps19\\Documents\\Github\\graxis-M2',
        'C:\\Users\\mps19\\Documents\\Github\\graxis-M2\\packages\\scoring'
      )
    ).toBe(true);
  });

  it('returns false for sibling directories', () => {
    expect(
      isCurrentWorktreePath(
        'C:\\Users\\mps19\\Documents\\Github\\graxis-M2',
        'C:\\Users\\mps19\\Documents\\Github\\graxis'
      )
    ).toBe(false);
  });
});
