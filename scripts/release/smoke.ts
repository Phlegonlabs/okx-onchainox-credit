import { writeStderr, writeStdout } from './io';
import { runReleaseSmoke } from './smoke-lib';

function parseArgs(argv: string[]): { baseUrl: string; json: boolean } {
  let baseUrl: string | null = null;
  let json = false;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === '--json') {
      json = true;
      continue;
    }

    if (argument === '--base-url') {
      baseUrl = argv[index + 1] ?? null;
      index += 1;
    }
  }

  if (!baseUrl) {
    throw new Error('--base-url is required');
  }

  return { baseUrl, json };
}

async function main(): Promise<void> {
  const { baseUrl, json } = parseArgs(process.argv.slice(2));
  const results = await runReleaseSmoke({ baseUrl });

  if (json) {
    writeStdout(JSON.stringify(results, null, 2));
  } else {
    writeStdout(`Release smoke: ${baseUrl}`);

    for (const result of results) {
      const status = result.ok ? 'PASS' : 'FAIL';
      const printer = result.ok ? writeStdout : writeStderr;
      printer(`- [${status}] ${result.name}: ${result.details}`);
    }
  }

  if (results.some((result) => !result.ok)) {
    process.exitCode = 1;
  }
}

void main().catch((error) => {
  writeStderr(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
