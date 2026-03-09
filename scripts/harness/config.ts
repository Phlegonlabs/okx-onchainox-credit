// Shared constants and output helpers — imported by every other module.
import process from 'node:process';

export const PKG = process.env.PKG_MGR ?? 'bun';
export const PROGRESS_FILE = 'docs/progress.json';
export const PLAN_FILE = 'docs/PLAN.md';
export const SCHEMA_FILE = 'schemas/progress.schema.json';
export const PLANS_DIR = 'docs/exec-plans/active';
export const FINISH_LOCK_FILE = '.git/harness-finish.lock';
export const FILE_LIMIT = 500;
export const SOURCE_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx']);
export const IGNORE_DIRS = new Set([
  'node_modules', 'dist', 'build', '.next', 'out', 'coverage', '.git', 'scripts/harness'
]);
export const STALE_AGENT_MS = 2 * 60 * 60 * 1000; // 2 hours

// ─── Colors ──────────────────────────────────────────────────────────────────
export const R = '\x1b[31m', G = '\x1b[32m', Y = '\x1b[33m', B = '\x1b[34m';
export const D = '\x1b[2m', N = '\x1b[0m';
export const ok = (m: string) => console.log(`${G}✓${N} ${m}`);
export const warn = (m: string) => console.warn(`${Y}⚠${N} ${m}`);
export const fail = (m: string): never => {
  console.error(`${R}✗${N} ${m}`);
  process.exit(1);
  throw new Error(m);
};
export const step = (m: string) => console.log(`${Y}▶${N} ${m}`);
export const info = (m: string) => console.log(`${B}ℹ${N} ${m}`);
