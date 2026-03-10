import { readFile } from 'node:fs/promises';
import {
  type IssuedCredential,
  parseIssuedCredential,
  verifyCredentialSignature,
} from '@okx-credit/scoring';
import type { Command } from 'commander';
import { CliError } from '../lib/errors.js';
import type { CliIo } from '../lib/io.js';

interface VerifyCommandDependencies {
  fileReader?: (path: string) => Promise<string>;
  io: CliIo;
  verifyCredential?: (credential: IssuedCredential) => Promise<boolean>;
}

function formatVerificationResult(credential: IssuedCredential, valid: boolean): string {
  return [
    `Valid: ${valid ? 'true' : 'false'}`,
    `Wallet: ${credential.wallet}`,
    `Score: ${credential.score} (${credential.tier})`,
    `Issued at: ${new Date(credential.issuedAt * 1_000).toISOString()}`,
    `Expires at: ${new Date(credential.expiresAt * 1_000).toISOString()}`,
  ].join('\n');
}

export function registerVerifyCommand(program: Command, dependencies: VerifyCommandDependencies) {
  const fileReader = dependencies.fileReader ?? ((path: string) => readFile(path, 'utf8'));
  const verify =
    dependencies.verifyCredential ??
    (async (credential: IssuedCredential) => {
      const { signature, ...payload } = credential;
      return verifyCredentialSignature(payload, signature);
    });

  program
    .command('verify')
    .description('Verify an issued credential JSON file')
    .argument('<credential-json-path>', 'Path to a credential JSON file')
    .action(async (credentialPath: string) => {
      const raw = await fileReader(credentialPath);
      const credential = parseIssuedCredential(raw);
      const valid = await verify(credential);

      dependencies.io.stdout(formatVerificationResult(credential, valid));

      if (!valid) {
        throw new CliError('Credential is invalid.', 1, true);
      }
    });
}
