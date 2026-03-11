import {
  type ReleaseEnvironmentTarget,
  getReleaseEnvReport,
} from '../../apps/web/src/lib/release/env-report';
import { readEnvFile } from './env-file';
import { writeStderr, writeStdout } from './io';

interface ParsedArgs {
  envFile: string | undefined;
  json: boolean;
  target: ReleaseEnvironmentTarget;
}

function parseArgs(argv: string[]): ParsedArgs {
  let envFile: string | undefined;
  let json = false;
  let target: ReleaseEnvironmentTarget = 'production';

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === '--json') {
      json = true;
      continue;
    }

    if (argument === '--env-file') {
      envFile = argv[index + 1];
      index += 1;
      continue;
    }

    if (argument === '--target') {
      const rawTarget = argv[index + 1];

      if (rawTarget === 'preview' || rawTarget === 'production') {
        target = rawTarget;
        index += 1;
        continue;
      }

      throw new Error('--target must be either preview or production');
    }
  }

  return { envFile, json, target };
}

function printIssueBlock(
  label: 'Errors' | 'Warnings',
  issues: { envName?: string; message: string }[]
): void {
  if (issues.length === 0) {
    return;
  }

  const writer = writeStderr;
  writer(`${label}:`);

  for (const issue of issues) {
    const prefix = issue.envName ? `- ${issue.envName}: ` : '- ';
    writer(`${prefix}${issue.message}`);
  }
}

async function main(): Promise<void> {
  const { envFile, json, target } = parseArgs(process.argv.slice(2));
  const envFromFile = envFile ? await readEnvFile(envFile) : {};
  const env = {
    ...process.env,
    ...envFromFile,
  };
  const report = getReleaseEnvReport(env, target);

  if (json) {
    writeStdout(JSON.stringify(report, null, 2));
  } else {
    writeStdout(`Release env preflight: ${target}`);
    writeStdout(`- App URL: ${report.summary.appUrl ?? 'missing'}`);
    writeStdout(`- Database URL: ${report.summary.databaseUrl ?? 'missing'}`);
    writeStdout(`- Payment token: ${report.summary.paymentToken ?? 'missing'}`);
    writeStdout(`- Local integration mode: ${report.summary.localIntegrationMode ?? 'unset'}`);
    printIssueBlock('Warnings', report.warnings);
    printIssueBlock('Errors', report.errors);
  }

  if (report.errors.length > 0) {
    process.exitCode = 1;
  }
}

void main().catch((error) => {
  writeStderr(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
