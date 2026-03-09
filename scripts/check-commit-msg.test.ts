import { describe, expect, it } from 'vitest';
import { validateCommitMessage } from './check-commit-msg.js';

describe('validateCommitMessage', () => {
  it('accepts milestone task commits', () => {
    expect(validateCommitMessage('[M1-003] add commit hooks').valid).toBe(true);
  });

  it('accepts harness merge commits', () => {
    expect(validateCommitMessage('feat: complete M1 — Foundation & Infrastructure').valid).toBe(
      true
    );
  });

  it('rejects messages outside the project formats', () => {
    expect(validateCommitMessage('chore: update deps')).toEqual({
      valid: false,
      error: 'Commit message must match "[M<n>-<id>] summary" or "feat: complete M<n> ...".',
    });
  });
});
