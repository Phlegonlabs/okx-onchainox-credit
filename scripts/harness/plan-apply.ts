// plan:apply and plan:status — parse plan files, show progress overview.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ok, warn, info, step, PLANS_DIR } from './config.js';
import { loadProgress, saveProgress } from './state.js';

export async function runPlanApply(specificFile?: string): Promise<void> {
  if (!existsSync(PLANS_DIR)) {
    warn(`Plans directory not found: ${PLANS_DIR}`);
    return;
  }

  const files = specificFile
    ? [specificFile]
    : readdirSync(PLANS_DIR).filter((file: string) => file.endsWith('.md') && !file.startsWith('_'));

  if (files.length === 0) {
    info('No plan files to apply.');
    return;
  }

  const p = loadProgress();
  let applied = 0;

  for (const file of files) {
    if (p.synced_plans.includes(file)) {
      info(`Already synced: ${file}`);
      continue;
    }

    step(`Applying: ${file}`);
    const content = readFileSync(join(PLANS_DIR, file), 'utf-8');

    // Parse milestone tables from plan file (### M<n>: ... format)
    const milestoneBlocks = content.matchAll(
      /###\s+(M\d+):\s+(.+?)\n[\s\S]*?\| Task ID[\s\S]*?(?=###\s+M\d+:|$)/g
    );

    for (const match of milestoneBlocks) {
      const [, id = '', title = ''] = match;
      const existing = p.active_milestones.find(m => m.id === id);
      if (!existing) {
        p.active_milestones.push({
          id, title, status: 'not_started',
          tasks_total: 0, tasks_done: 0,
          tasks_in_progress: 0, tasks_blocked: 0, tasks_remaining: 0,
          tasks: []
        });
        info(`  Added milestone: ${id} — ${title}`);
      }
    }

    p.synced_plans.push(file);
    applied++;
  }

  saveProgress(p);
  if (applied > 0) ok(`Applied ${applied} plan file(s)`);
}

export async function runPlanStatus(): Promise<void> {
  const p = loadProgress();

  info(`=== Plan Status: ${p.project} ===`);
  info('');

  const total = p.active_milestones.length + p.completed_milestones.length;
  const done = p.completed_milestones.length;
  info(`Progress: ${done}/${total} milestones complete`);
  info('');

  if (p.completed_milestones.length > 0) {
    info('Completed:');
    for (const m of p.completed_milestones) {
      info(`  ✅ ${m.id}: ${m.name} (${m.completed_at?.split('T')[0]})`);
    }
    info('');
  }

  if (p.active_milestones.length > 0) {
    info('Active / Pending:');
    for (const m of p.active_milestones) {
      const done = m.tasks_done ?? 0;
      const total = m.tasks_total ?? 0;
      const deps = m.depends_on?.join(', ') || 'none';
      const icon = m.status === 'in_progress' ? '🟡' : '⬜';
      info(`  ${icon} ${m.id}: ${m.title} (${done}/${total}) — deps: ${deps}`);
    }
  }

  info('');
  info(`Next available milestone number: M${total + 1}`);
}
