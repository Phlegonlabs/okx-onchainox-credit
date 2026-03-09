// merge-gate, stale-check, changelog, schema, learn commands.
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, appendFileSync } from 'node:fs';
import { ok, warn, fail, step, info, PROGRESS_FILE, SCHEMA_FILE, PLANS_DIR } from './config.js';
import { loadProgress, saveProgress } from './state.js';

export async function runMergeGate(): Promise<void> {
  step('Running merge-gate...');

  // 1. validate:full
  const { runValidate } = await import('./validate.js');
  await runValidate(true);

  // 2. stale-check
  await runStaleCheck();

  // 3. changelog
  await runChangelog();

  ok('merge-gate passed — ready to merge');
  info('The worktree:finish will be queued automatically.');
}

export async function runStaleCheck(): Promise<void> {
  step('Stale check...');
  let issues = 0;

  // Check .env.example is up to date
  if (!existsSync('.env.example')) {
    warn('Missing .env.example');
    issues++;
  }

  // Check progress.json exists
  if (!existsSync(PROGRESS_FILE)) {
    warn(`Missing ${PROGRESS_FILE}`);
    issues++;
  }

  // Check for unsynced plan files
  if (existsSync(PLANS_DIR)) {
    const { readdirSync } = await import('node:fs');
    const plans = readdirSync(PLANS_DIR).filter(f => f.endsWith('.md') && !f.startsWith('_'));
    const p = loadProgress();
    const unsynced = plans.filter(f => !p.synced_plans.includes(f));
    if (unsynced.length > 0) {
      warn(`Unsynced plan files: ${unsynced.join(', ')}`);
      info('Run: bun run harness plan:apply');
      issues++;
    }
  }

  if (issues === 0) {
    ok('stale-check: no issues found');
  } else {
    warn(`stale-check: ${issues} issue(s) found`);
  }
}

export async function runChangelog(from?: string, to?: string): Promise<void> {
  step('Generating changelog...');
  try {
    const range = from && to ? `${from}..${to}` : from ? `${from}..HEAD` : 'HEAD~20..HEAD';
    const log = execSync(
      `git log ${range} --pretty=format:"- %s" --grep="\\[M"`,
      { encoding: 'utf-8' }
    ).trim();

    if (log) {
      info('Changelog:');
      console.log(log);
    } else {
      info('No milestone commits found in range.');
    }
  } catch {
    warn('Could not generate changelog (git log failed)');
  }
}

export async function runSchema(): Promise<void> {
  step('Validating progress.json schema...');
  if (!existsSync(PROGRESS_FILE)) fail(`${PROGRESS_FILE} not found`);

  const p = loadProgress();
  const required = ['project', 'last_updated', 'active_milestones', 'completed_milestones',
    'blockers', 'learnings', 'dependency_graph', 'synced_plans', 'agents', 'finish_jobs'];

  for (const key of required) {
    if (!(key in p)) fail(`progress.json missing required field: ${key}`);
  }

  ok(`schema: progress.json is valid (${p.active_milestones.length} active milestones)`);
}

export async function runLearn(category: string, message: string): Promise<void> {
  const p = loadProgress();
  const entry = { category, message, added_at: new Date().toISOString() };
  p.learnings.push(entry);
  saveProgress(p);

  // Also append to learnings.md
  const line = `\n## ${category} (${new Date().toISOString().split('T')[0]})\n\n- ${message}\n`;
  if (existsSync('docs/learnings.md')) {
    appendFileSync('docs/learnings.md', line);
  }

  ok(`Learning saved: [${category}] ${message}`);
}
