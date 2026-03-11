import { syncCredentialSigner } from './credential-signer';
import { writeStderr, writeStdout } from './release/io';

interface ParsedArgs {
  writeEnvFile: string;
  force: boolean;
  includeSiwe: boolean;
}

function parseArgs(argv: string[]): ParsedArgs {
  let writeEnvFile = '.env.local';
  let force = false;
  let includeSiwe = false;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === '--write-env-file') {
      writeEnvFile = argv[index + 1] ?? writeEnvFile;
      index += 1;
      continue;
    }

    if (argument === '--force') {
      force = true;
      continue;
    }

    if (argument === '--include-siwe') {
      includeSiwe = true;
    }
  }

  return { writeEnvFile, force, includeSiwe };
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const result = await syncCredentialSigner({
    envFile: options.writeEnvFile,
    force: options.force,
    includeSiwe: options.includeSiwe,
  });

  writeStdout(`Credential signer env file: ${result.envFile}`);

  if (result.created) {
    writeStdout(`- ECDSA signer address: ${result.created.publicAddress}`);
    writeStdout('- ECDSA private key: configured');

    if (result.created.siweSessionSecret) {
      writeStdout('- SIWE session secret: configured');
    }
  } else {
    writeStdout('- No new secrets were generated');
  }

  if (result.reusedExistingSigner) {
    writeStdout('- Reused existing ECDSA signer');
  }

  if (result.reusedExistingSiweSecret) {
    writeStdout('- Reused existing SIWE session secret');
  }
}

void main().catch((error) => {
  writeStderr(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
