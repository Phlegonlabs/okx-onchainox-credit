// Recovery: detect and close milestones whose tasks are all done.
import { ok, info, warn } from './config.js';
import { loadProgress, saveProgress } from './state.js';

export async function runRecover(): Promise<void> {
  const p = loadProgress();
  let recovered = 0;

  for (const m of [...p.active_milestones]) {
    if (!m.tasks || m.tasks.length === 0) continue;
    const allDone = m.tasks.every(t => (t as Record<string, unknown>)['status'] === 'done');
    if (allDone && m.status !== 'complete') {
      warn(`Milestone ${m.id} has all tasks done but wasn't closed. Auto-recovering...`);
      p.completed_milestones.push({
        id: m.id,
        name: m.title,
        completed_at: new Date().toISOString()
      });
      p.active_milestones = p.active_milestones.filter(a => a.id !== m.id);
      recovered++;
    }
  }

  if (recovered > 0) {
    saveProgress(p);
    ok(`Recovered ${recovered} milestone(s)`);
  } else {
    info('No recovery needed');
  }
}
