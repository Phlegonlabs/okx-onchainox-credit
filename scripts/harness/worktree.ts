// Worktree lifecycle commands: start, finish, rebase, reclaim, status.
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { ok, warn, fail, step, info, PKG } from './config.js';
import { loadProgress, saveProgress } from './state.js';
import type { ActiveMilestone, Progress } from './types.js';

function requireMilestone(p: Progress, milestoneId: string): ActiveMilestone {
  const milestone = p.active_milestones.find(entry => entry.id === milestoneId);
  if (!milestone) {
    fail(`Milestone ${milestoneId} not found in progress.json`);
  }

  return milestone!;
}

function getMainRoot(): string {
  try {
    const topLevel = execSync('git rev-parse --show-toplevel', { encoding: 'utf-8' }).trim();
    const commonDir = execSync('git rev-parse --git-common-dir', { encoding: 'utf-8' }).trim();
    return resolveMainRoot(topLevel, commonDir);
  } catch {
    return process.cwd();
  }
}

export function resolveMainRoot(topLevel: string, commonDir: string): string {
  const trimmedTopLevel = topLevel.trim();
  const trimmedCommonDir = commonDir.trim();

  if (!trimmedCommonDir || trimmedCommonDir === '.git') {
    return trimmedTopLevel;
  }

  return dirname(resolve(trimmedCommonDir));
}

function getMilestoneWorktreePath(milestoneId: string, mainRoot: string): string {
  const projectName = mainRoot.split('/').pop() ?? 'project';
  return join(mainRoot, '..', `${projectName}-${milestoneId}`);
}

export async function runWorktreeStart(milestoneId: string): Promise<void> {
  const id = milestoneId.toUpperCase();
  const p = loadProgress();
  const targetMilestone = requireMilestone(p, id);

  // Check dependencies
  const deps = targetMilestone.depends_on ?? [];
  for (const dep of deps) {
    if (!p.completed_milestones.some(c => c.id === dep)) {
      fail(`Cannot start ${id}: depends on ${dep} which is not complete`);
    }
  }

  const mainRoot = getMainRoot();
  const worktreePath = getMilestoneWorktreePath(id, mainRoot);
  const branch = `milestone/m${id.replace('M', '').toLowerCase()}`;

  if (existsSync(worktreePath)) {
    warn(`Worktree already exists: ${worktreePath}`);
    info(`cd ${worktreePath} && bun run harness init`);
    return;
  }

  step(`Creating worktree for ${id}...`);
  try {
    execSync(`git worktree add -b ${branch} "${worktreePath}" main`, { stdio: 'inherit' });
  } catch {
    // Branch may already exist
    execSync(`git worktree add "${worktreePath}" ${branch}`, { stdio: 'inherit' });
  }

  step('Installing dependencies...');
  execSync(`cd "${worktreePath}" && ${PKG} install`, { stdio: 'inherit' });

  // Update milestone status
  targetMilestone.status = 'in_progress';
  targetMilestone.branch = branch;
  targetMilestone.worktree = worktreePath;
  targetMilestone.started_at = new Date().toISOString();
  saveProgress(p);

  ok(`Worktree ready: ${worktreePath}`);
  info(`cd "${worktreePath}" && bun run harness init`);
}

export async function runWorktreeFinish(milestoneId: string): Promise<void> {
  const id = milestoneId.toUpperCase();
  step(`Finishing worktree for ${id}...`);

  const p = loadProgress();
  const targetMilestone = requireMilestone(p, id);

  const mainRoot = getMainRoot();
  const worktreePath = getMilestoneWorktreePath(id, mainRoot);
  const branch = targetMilestone.branch ?? `milestone/m${id.replace('M', '').toLowerCase()}`;

  // Rebase onto main
  step('Rebasing onto main...');
  try {
    execSync(`cd "${worktreePath}" && git rebase main`, { stdio: 'inherit' });
  } catch {
    fail('Rebase failed. Resolve conflicts manually, then re-run worktree:finish.');
  }

  // Merge into main
  step('Merging into main...');
  execSync(`git merge --no-ff ${branch} -m "feat: complete ${id} — ${targetMilestone.title}"`,
    { stdio: 'inherit', cwd: mainRoot });

  // Push
  try {
    execSync('git push origin main', { stdio: 'inherit', cwd: mainRoot });
  } catch {
    warn('Push failed — push manually when ready');
  }

  // Remove worktree
  execSync(`git worktree remove "${worktreePath}" --force`, { stdio: 'inherit', cwd: mainRoot });

  // Update progress
  p.completed_milestones.push({
    id, name: targetMilestone.title ?? id, completed_at: new Date().toISOString()
  });
  p.active_milestones = p.active_milestones.filter(m => m.id !== id);
  saveProgress(p);

  ok(`${id} complete and merged!`);

  // Auto-start next milestone
  const next = p.active_milestones.find(m => {
    const deps = m.depends_on ?? [];
    return m.status === 'not_started' &&
      deps.every(d => p.completed_milestones.some(c => c.id === d));
  });
  if (next) {
    info(`Auto-starting next milestone: ${next.id}`);
    await runWorktreeStart(next.id);
  }
}

export async function runWorktreeRebase(): Promise<void> {
  step('Rebasing worktree onto main...');
  try {
    execSync('git rebase main', { stdio: 'inherit' });
    ok('Rebase complete');
  } catch {
    fail('Rebase failed. Resolve conflicts and run: git rebase --continue');
  }
}

export async function runWorktreeReclaim(milestoneId: string): Promise<void> {
  warn(`Reclaiming stale worktree for ${milestoneId}...`);
  const p = loadProgress();
  p.agents = p.agents.filter(a => a.milestone !== milestoneId);
  saveProgress(p);
  ok(`Reclaimed: ${milestoneId}. Start fresh with: bun run harness init`);
}

export async function runWorktreeStatus(): Promise<void> {
  const p = loadProgress();
  info('=== Worktree Status ===');

  try {
    const wtList = execSync('git worktree list', { encoding: 'utf-8' });
    info(wtList);
  } catch {
    warn('Could not list worktrees');
  }

  info(`Active agents: ${p.agents.length}`);
  info(`Finish jobs: ${p.finish_jobs.length}`);

  for (const m of p.active_milestones.filter(m => m.status === 'in_progress')) {
    const done = m.tasks_done ?? 0;
    const total = m.tasks_total ?? 0;
    info(`  🟡 ${m.id}: ${done}/${total} tasks — branch: ${m.branch ?? 'unknown'}`);
  }
}
