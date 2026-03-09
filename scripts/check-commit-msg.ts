import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';

const TASK_COMMIT_PATTERN = /^\[M\d+-\d{3}\] .+/;
const MERGE_COMMIT_PATTERN = /^feat: complete M\d+\b.+/;
const AUXILIARY_COMMIT_PATTERNS = [/^Merge\b.+/, /^Revert\b.+/, /^(fixup|squash)!.+/];

export function validateCommitMessage(message: string): { valid: boolean; error?: string } {
  const subject = message.trim().split(/\r?\n/, 1)[0] ?? '';

  if (!subject) {
    return {
      valid: false,
      error: 'Commit message cannot be empty.',
    };
  }

  if (TASK_COMMIT_PATTERN.test(subject) || MERGE_COMMIT_PATTERN.test(subject)) {
    return { valid: true };
  }

  if (AUXILIARY_COMMIT_PATTERNS.some((pattern) => pattern.test(subject))) {
    return { valid: true };
  }

  return {
    valid: false,
    error: 'Commit message must match "[M<n>-<id>] summary" or "feat: complete M<n> ...".',
  };
}

function runCli(args: string[]): number {
  const commitMsgFile = args[0];
  if (!commitMsgFile) {
    process.stderr.write('Usage: bun run check:commit-msg <commit-msg-file>\n');
    return 1;
  }

  const content = readFileSync(resolve(commitMsgFile), 'utf-8');
  const result = validateCommitMessage(content);

  if (!result.valid) {
    process.stderr.write(`${result.error}\n`);
    return 1;
  }

  return 0;
}

const isEntrypoint = process.argv[1]
  ? resolve(process.argv[1]).endsWith('scripts\\check-commit-msg.ts') ||
    resolve(process.argv[1]).endsWith('scripts/check-commit-msg.ts')
  : false;

if (isEntrypoint) {
  process.exit(runCli(process.argv.slice(2)));
}
