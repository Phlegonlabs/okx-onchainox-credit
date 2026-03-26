// init, status, next, start, done, block, reset commands.
import { execSync } from 'node:child_process';
import { loadProgress, saveProgress } from './state.js';
import { ok, warn, info, step, fail } from './config.js';
import type { ActiveMilestone, Progress } from './types.js';

function requireActiveMilestone(p: Progress): ActiveMilestone & { tasks: Array<Record<string, unknown>> } {
  const milestone = p.active_milestones.find(m => m.status === 'in_progress');
  if (!milestone || !milestone.tasks) {
    fail('No active milestone in progress.');
  }

  return milestone as ActiveMilestone & { tasks: Array<Record<string, unknown>> };
}

function requireTask(
  tasks: Array<Record<string, unknown>>,
  taskId: string,
  message: string
): Record<string, unknown> {
  const task = tasks.find(entry => entry['id'] === taskId);
  if (!task) {
    fail(message);
  }

  return task!;
}

function syncCurrentMilestone(
  p: Progress,
  milestone: ActiveMilestone & { tasks: Array<Record<string, unknown>> }
): void {
  p.current_milestone = {
    id: milestone.id,
    name: milestone.title,
    branch: milestone.branch ?? '',
    worktree: String(milestone.worktree ?? ''),
    status: milestone.status ?? 'not_started',
    tasks_total: milestone.tasks_total ?? milestone.tasks.length,
    tasks_done: milestone.tasks_done ?? 0,
    tasks_in_progress: milestone.tasks_in_progress ?? 0,
    tasks_blocked: milestone.tasks_blocked ?? 0,
    tasks_remaining: milestone.tasks_remaining ?? Math.max(0, milestone.tasks.length),
  };
}

function syncCurrentTask(p: Progress, task: Record<string, unknown> | null): void {
  if (!task) {
    p.current_task = null;
    return;
  }

  p.current_task = {
    id: String(task['id'] ?? ''),
    story: String(task['story'] ?? ''),
    description: String(task['description'] ?? ''),
    status: String(task['status'] ?? 'not_started'),
    started_at: String(task['started_at'] ?? ''),
    files_touched: [],
    notes: '',
  };
}

export async function runInit(): Promise<void> {
  step('Harness init — Graxis');
  const p = loadProgress();
  info(`Project: ${p.project}`);
  info(`Last updated: ${p.last_updated}`);

  // Show active milestones
  if (p.active_milestones.length === 0) {
    warn('No active milestones. Run: bun run harness worktree:start M1');
    return;
  }

  // Find current milestone + task
  const activeMilestone = p.active_milestones.find(m => m.status === 'in_progress');
  if (!activeMilestone) {
    const nextMilestone = p.active_milestones.find(m => {
      const deps = m.depends_on ?? [];
      return m.status === 'not_started' &&
        deps.every(d => p.completed_milestones.some(c => c.id === d));
    });
    if (nextMilestone) {
      info(`Next available milestone: ${nextMilestone.id} — ${nextMilestone.title}`);
      info(`Start with: bun run harness worktree:start ${nextMilestone.id}`);
    } else {
      info('All available milestones are blocked on dependencies or complete.');
    }
    return;
  }

  const inProgress = activeMilestone.tasks?.find(t =>
    (t as Record<string, unknown>)['status'] === 'in_progress'
  ) as Record<string, unknown> | undefined;

  if (inProgress) {
    ok(`Resuming: ${inProgress['id']} — ${inProgress['description']}`);
    info('Write code, then run: bun run harness validate');
  } else {
    await runNext();
  }
}

export async function runStatus(): Promise<void> {
  const p = loadProgress();
  info(`=== ${p.project} ===`);
  info(`Active milestones: ${p.active_milestones.filter(m => m.status === 'in_progress').length}`);
  for (const m of p.active_milestones) {
    const done = m.tasks_done ?? 0;
    const total = m.tasks_total ?? 0;
    const status = m.status === 'in_progress' ? '🟡' : m.status === 'not_started' ? '⬜' : '✅';
    info(`  ${status} ${m.id}: ${m.title} (${done}/${total} tasks)`);
  }
  if (p.blockers.length > 0) {
    warn(`Blockers: ${p.blockers.length}`);
    for (const b of p.blockers) warn(`  🚫 ${b.task_id}: ${b.description}`);
  }
}

export async function runNext(): Promise<void> {
  const p = loadProgress();
  const hasActiveMilestone = p.active_milestones.some(m => m.status === 'in_progress');
  if (!hasActiveMilestone) {
    warn('No active milestone in progress.');
    return;
  }
  const activeMilestone = requireActiveMilestone(p);
  const activeTasks = activeMilestone.tasks;

  const blockedIds = new Set(p.blockers.map(b => b.task_id));
  const nextTask = activeTasks.find(t => {
    const task = t as Record<string, unknown>;
    return task['status'] === 'not_started' && !blockedIds.has(task['id'] as string);
  }) as Record<string, unknown> | undefined;

  if (!nextTask) {
    const allDone = activeTasks.every(t =>
      (t as Record<string, unknown>)['status'] === 'done'
    );
    if (allDone) {
      ok(`All tasks complete in ${activeMilestone.id}! Run: bun run harness merge-gate`);
    } else {
      warn('No unblocked tasks available. Check blockers with: bun run harness status');
    }
    return;
  }

  await runStart(nextTask['id'] as string);
}

export async function runStart(taskId: string): Promise<void> {
  const p = loadProgress();
  const activeMilestone = requireActiveMilestone(p);
  const activeTasks = activeMilestone.tasks;
  const task = requireTask(activeTasks, taskId, `Task ${taskId} not found in active milestone.`);

  if (task['status'] !== 'in_progress') {
    activeMilestone.tasks_in_progress = (activeMilestone.tasks_in_progress ?? 0) + 1;
  }
  task['status'] = 'in_progress';
  task['started_at'] = new Date().toISOString();
  syncCurrentMilestone(p, activeMilestone);
  syncCurrentTask(p, task);

  saveProgress(p);
  ok(`Started: ${taskId} — ${task['description']}`);
  info('Write code, then run: bun run harness validate');
}

export async function runDone(taskId: string): Promise<void> {
  const p = loadProgress();
  const activeMilestone = requireActiveMilestone(p);
  const activeTasks = activeMilestone.tasks;
  const task = requireTask(activeTasks, taskId, `Task ${taskId} not found.`);
  const wasDone = task['status'] === 'done';
  const wasInProgress = task['status'] === 'in_progress';

  task['status'] = 'done';
  task['completed_at'] = new Date().toISOString();

  // Get commit hash
  try {
    const hash = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
    task['commit'] = hash;
  } catch { /* not in git */ }

  if (!wasDone) {
    activeMilestone.tasks_done = (activeMilestone.tasks_done ?? 0) + 1;
    activeMilestone.tasks_remaining = Math.max(0, (activeMilestone.tasks_remaining ?? 0) - 1);
  }
  if (wasInProgress) {
    activeMilestone.tasks_in_progress = Math.max(0, (activeMilestone.tasks_in_progress ?? 0) - 1);
  }
  syncCurrentMilestone(p, activeMilestone);
  syncCurrentTask(p, null);

  saveProgress(p);
  ok(`Done: ${taskId}`);

  const allDone = activeTasks.every(t =>
    (t as Record<string, unknown>)['status'] === 'done'
  );
  if (allDone) {
    ok(`All tasks complete in ${activeMilestone.id}!`);
    info('Auto-running merge gate...');
    const { runMergeGate } = await import('./quality.js');
    await runMergeGate();
    info(`Auto-running worktree finish for ${activeMilestone.id}...`);
    const { runWorktreeFinish } = await import('./worktree.js');
    await runWorktreeFinish(activeMilestone.id);
  } else {
    await runNext();
  }
}

export async function runBlock(taskId: string, reason: string): Promise<void> {
  const p = loadProgress();
  p.blockers.push({ task_id: taskId, description: reason, added_at: new Date().toISOString() });

  // Update task status
  for (const m of p.active_milestones) {
    const task = m.tasks?.find(t => (t as Record<string, unknown>)['id'] === taskId) as
      Record<string, unknown> | undefined;
    if (task) {
      task['status'] = 'blocked';
      m.tasks_blocked = (m.tasks_blocked ?? 0) + 1;
      m.tasks_in_progress = Math.max(0, (m.tasks_in_progress ?? 0) - 1);
    }
  }

  saveProgress(p);
  warn(`Blocked: ${taskId} — ${reason}`);
  await runNext();
}

export async function runReset(taskId: string): Promise<void> {
  const p = loadProgress();
  p.blockers = p.blockers.filter(b => b.task_id !== taskId);

  for (const m of p.active_milestones) {
    const task = m.tasks?.find(t => (t as Record<string, unknown>)['id'] === taskId) as
      Record<string, unknown> | undefined;
    if (task && (task['status'] === 'blocked' || task['status'] === 'in_progress')) {
      task['status'] = 'not_started';
      m.tasks_blocked = Math.max(0, (m.tasks_blocked ?? 0) - 1);
    }
  }

  saveProgress(p);
  ok(`Reset: ${taskId}`);
}
