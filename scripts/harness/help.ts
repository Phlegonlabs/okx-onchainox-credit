import { info } from './config.js';

const HELP_COMMANDS = new Set(['help', '--help', '-h']);

export function isHelpCommand(command: string | undefined): boolean {
  return !command || HELP_COMMANDS.has(command);
}

export function runHelp() {
  info('OKX OnchainOS Credit — Harness CLI');
  info('Usage: bun run harness <command>');
  info('');
  info('Core loop:  init | validate | done <id>');
  info('Tasks:      status | next | start <id> | block <id> <reason> | reset <id>');
  info('Quality:    merge-gate | stale-check | file-guard | changelog | schema');
  info('Worktree:   worktree:start/finish/rebase/reclaim/status');
  info('Plans:      plan:apply | plan:status');
  info('Scaffold:   scaffold <type>');
}
