// validate, validate:full, file-guard commands.
import { execSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { ok, warn, fail, step, FILE_LIMIT, SOURCE_EXTS, IGNORE_DIRS } from './config.js';

export async function runValidate(full: boolean): Promise<void> {
  step('Running validate...');

  try {
    step('lint:fix');
    execSync('bun run lint:fix', { stdio: 'inherit' });

    step('lint');
    execSync('bun run lint', { stdio: 'inherit' });

    step('type-check');
    execSync('bun run type-check', { stdio: 'inherit' });

    step('test');
    execSync('bun run test', { stdio: 'inherit' });

    if (full) {
      step('test:integration');
      execSync('bun run test:integration', { stdio: 'inherit' });

      step('file-guard');
      await runFileGuard(false);
    }

    ok('validate passed');
  } catch {
    fail('validate failed — fix errors before committing');
  }
}

export async function runFileGuard(stagedOnly: boolean): Promise<void> {
  const violations: string[] = [];

  function scanDir(dir: string): void {
    let entries: string[];
    try { entries = readdirSync(dir); } catch { return; }

    for (const entry of entries) {
      if (IGNORE_DIRS.has(entry)) continue;
      const fullPath = join(dir, entry);
      let stat;
      try { stat = statSync(fullPath); } catch { continue; }

      if (stat.isDirectory()) {
        scanDir(fullPath);
      } else if (SOURCE_EXTS.has(extname(entry))) {
        const content = (() => {
          try {
            return readFileSync(fullPath, 'utf-8');
          } catch {
            return '';
          }
        })();
        const lines = content.split('\n').length;
        if (lines > FILE_LIMIT) {
          violations.push(`${fullPath}: ${lines} lines (limit: ${FILE_LIMIT})`);
        }
      }
    }
  }

  if (stagedOnly) {
    // Check only staged files
    try {
      const staged = execSync('git diff --cached --name-only', { encoding: 'utf-8' })
        .trim().split('\n').filter(Boolean);
      for (const file of staged) {
        if (!SOURCE_EXTS.has(extname(file))) continue;
        try {
          const content = execSync(`git show :${file}`, { encoding: 'utf-8' });
          const lines = content.split('\n').length;
          if (lines > FILE_LIMIT) violations.push(`${file}: ${lines} lines (limit: ${FILE_LIMIT})`);
        } catch { continue; }
      }
    } catch { return; }
  } else {
    scanDir('.');
  }

  if (violations.length > 0) {
    warn('File size violations (500-line limit):');
    for (const v of violations) warn(`  ${v}`);
    fail(`${violations.length} file(s) exceed 500 lines. Split before committing.`);
  } else {
    ok('file-guard: all files within 500-line limit');
  }
}
