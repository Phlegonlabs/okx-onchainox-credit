// Read/write progress.json and PLAN.md — thin wrappers, no business logic.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { PROGRESS_FILE, PLAN_FILE, fail } from './config.js';
import type { Progress } from './types.js';

export function loadProgress(): Progress {
  if (!existsSync(PROGRESS_FILE)) fail(`${PROGRESS_FILE} not found. Run from project root.`);
  return JSON.parse(readFileSync(PROGRESS_FILE, 'utf-8')) as Progress;
}

export function saveProgress(p: Progress): void {
  p.last_updated = new Date().toISOString();
  writeFileSync(PROGRESS_FILE, JSON.stringify(p, null, 2) + '\n');
}

export function loadPlan(): string {
  if (!existsSync(PLAN_FILE)) fail(`${PLAN_FILE} not found. Run from project root.`);
  return readFileSync(PLAN_FILE, 'utf-8');
}

export function savePlan(content: string): void {
  writeFileSync(PLAN_FILE, content);
}
