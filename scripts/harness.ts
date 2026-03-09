#!/usr/bin/env tsx
/**
 * Harness CLI — entry point (~85 lines).
 * All logic lives in ./harness/ sub-modules.
 * Run: bun run harness <command> [args]
 */
import process from 'node:process';
import { fail } from './harness/config.js';
import { isHelpCommand, runHelp } from './harness/help.js';

const [, , cmd, ...args] = process.argv;

async function main() {
  if (isHelpCommand(cmd)) {
    runHelp();
    return;
  }

  switch (cmd) {
    // ─── Core agent loop ──────────────────────────────────────────────────────
    case 'init': {
      const { runInit } = await import('./harness/tasks.js');
      await runInit();
      break;
    }
    case 'validate': {
      const { runValidate } = await import('./harness/validate.js');
      await runValidate(false);
      break;
    }
    case 'validate:full': {
      const { runValidate } = await import('./harness/validate.js');
      await runValidate(true);
      break;
    }
    case 'done': {
      const { runDone } = await import('./harness/tasks.js');
      await runDone(args[0] ?? fail('Usage: harness done <task-id>'));
      break;
    }
    // ─── Task management ──────────────────────────────────────────────────────
    case 'status': {
      const { runStatus } = await import('./harness/tasks.js');
      await runStatus();
      break;
    }
    case 'next': {
      const { runNext } = await import('./harness/tasks.js');
      await runNext();
      break;
    }
    case 'start': {
      const { runStart } = await import('./harness/tasks.js');
      await runStart(args[0] ?? fail('Usage: harness start <task-id>'));
      break;
    }
    case 'block': {
      const { runBlock } = await import('./harness/tasks.js');
      await runBlock(
        args[0] ?? fail('Usage: harness block <task-id> <reason>'),
        args.slice(1).join(' ') || 'unspecified'
      );
      break;
    }
    case 'reset': {
      const { runReset } = await import('./harness/tasks.js');
      await runReset(args[0] ?? fail('Usage: harness reset <task-id>'));
      break;
    }
    case 'learn': {
      const { runLearn } = await import('./harness/quality.js');
      await runLearn(
        args[0] ?? fail('Usage: harness learn <category> <message>'),
        args.slice(1).join(' ') || fail('Usage: harness learn <category> <message>')
      );
      break;
    }
    // ─── Quality gates ────────────────────────────────────────────────────────
    case 'merge-gate': {
      const { runMergeGate } = await import('./harness/quality.js');
      await runMergeGate();
      break;
    }
    case 'stale-check': {
      const { runStaleCheck } = await import('./harness/quality.js');
      await runStaleCheck();
      break;
    }
    case 'file-guard': {
      const { runFileGuard } = await import('./harness/validate.js');
      await runFileGuard(args.includes('--staged'));
      break;
    }
    case 'changelog': {
      const { runChangelog } = await import('./harness/quality.js');
      await runChangelog(args[0], args[1]);
      break;
    }
    case 'schema': {
      const { runSchema } = await import('./harness/quality.js');
      await runSchema();
      break;
    }
    case 'recover': {
      const { runRecover } = await import('./harness/recovery.js');
      await runRecover();
      break;
    }
    // ─── Worktree management ──────────────────────────────────────────────────
    case 'worktree:start': {
      const { runWorktreeStart } = await import('./harness/worktree.js');
      await runWorktreeStart(args[0] ?? fail('Usage: harness worktree:start <milestone-id>'));
      break;
    }
    case 'worktree:finish': {
      const { runWorktreeFinish } = await import('./harness/worktree.js');
      await runWorktreeFinish(args[0] ?? fail('Usage: harness worktree:finish <milestone-id>'));
      break;
    }
    case 'worktree:rebase': {
      const { runWorktreeRebase } = await import('./harness/worktree.js');
      await runWorktreeRebase();
      break;
    }
    case 'worktree:reclaim': {
      const { runWorktreeReclaim } = await import('./harness/worktree.js');
      await runWorktreeReclaim(args[0] ?? fail('Usage: harness worktree:reclaim <milestone-id>'));
      break;
    }
    case 'worktree:status': {
      const { runWorktreeStatus } = await import('./harness/worktree.js');
      await runWorktreeStatus();
      break;
    }
    // ─── Plan management ──────────────────────────────────────────────────────
    case 'plan:apply': {
      const { runPlanApply } = await import('./harness/plan-apply.js');
      await runPlanApply(args[0]);
      break;
    }
    case 'plan:status': {
      const { runPlanStatus } = await import('./harness/plan-apply.js');
      await runPlanStatus();
      break;
    }
    // ─── Scaffold ─────────────────────────────────────────────────────────────
    case 'scaffold': {
      const { runScaffold } = await import('./harness/scaffold-templates.js');
      await runScaffold(args[0]);
      break;
    }
    // ─── Help ─────────────────────────────────────────────────────────────────
    default: {
      runHelp();
      fail(`Unknown command: ${cmd}`);
      break;
    }
  }
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  fail(message);
});
