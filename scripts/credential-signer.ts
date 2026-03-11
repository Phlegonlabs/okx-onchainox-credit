import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Wallet } from 'ethers';
import { parseEnvFile } from './release/env-file';

export interface GeneratedCredentialSigner {
  privateKey: string;
  publicAddress: string;
  siweSessionSecret?: string;
}

export interface SyncCredentialSignerOptions {
  envFile: string;
  force: boolean;
  includeSiwe: boolean;
}

function isConfiguredValue(value: string | undefined): boolean {
  const normalizedValue = value?.trim();

  return Boolean(normalizedValue && normalizedValue !== 'placeholder');
}

export function createCredentialSigner(includeSiwe = false): GeneratedCredentialSigner {
  const wallet = Wallet.createRandom();

  const signer: GeneratedCredentialSigner = {
    privateKey: wallet.privateKey,
    publicAddress: wallet.address,
  };

  if (includeSiwe) {
    signer.siweSessionSecret = randomBytes(32).toString('hex');
  }

  return signer;
}

export function upsertEnvEntries(contents: string, entries: Record<string, string>): string {
  const lines = contents.length > 0 ? contents.split(/\r?\n/u) : [];
  const pendingKeys = new Set(Object.keys(entries));

  const updatedLines = lines.map((line) => {
    for (const [key, value] of Object.entries(entries)) {
      if (!new RegExp(`^\\s*(?:export\\s+)?${key}=`).test(line)) {
        continue;
      }

      pendingKeys.delete(key);
      return `${key}=${value}`;
    }

    return line;
  });

  if (updatedLines.length > 0 && updatedLines.at(-1)?.trim() !== '') {
    updatedLines.push('');
  }

  for (const key of pendingKeys) {
    updatedLines.push(`${key}=${entries[key]}`);
  }

  return `${updatedLines.join('\n').replace(/\n+$/u, '\n')}`;
}

async function readExistingEnv(filePath: string): Promise<NodeJS.ProcessEnv> {
  const resolvedPath = resolve(filePath);

  if (!existsSync(resolvedPath)) {
    return {};
  }

  return parseEnvFile(await readFile(resolvedPath, 'utf8'));
}

export async function syncCredentialSigner(options: SyncCredentialSignerOptions): Promise<{
  created: GeneratedCredentialSigner | null;
  envFile: string;
  reusedExistingSigner: boolean;
  reusedExistingSiweSecret: boolean;
}> {
  const existingEnv = await readExistingEnv(options.envFile);
  const hasPrivateKey = isConfiguredValue(existingEnv.ECDSA_PRIVATE_KEY);
  const hasPublicAddress = isConfiguredValue(existingEnv.ECDSA_PUBLIC_ADDRESS);
  const hasCompleteSigner = hasPrivateKey && hasPublicAddress;

  if ((hasPrivateKey || hasPublicAddress) && !hasCompleteSigner && !options.force) {
    throw new Error(
      `${options.envFile} contains a partial ECDSA signer. Re-run with --force to replace it.`
    );
  }

  const hasSiweSecret = isConfiguredValue(existingEnv.SIWE_SESSION_SECRET);
  const shouldCreateSigner = options.force || !hasCompleteSigner;
  const shouldCreateSiweSecret = options.includeSiwe && (options.force || !hasSiweSecret);
  const created =
    shouldCreateSigner || shouldCreateSiweSecret
      ? createCredentialSigner(shouldCreateSiweSecret)
      : null;

  const updates: Record<string, string> = {};

  if (created && shouldCreateSigner) {
    updates.ECDSA_PRIVATE_KEY = created.privateKey;
    updates.ECDSA_PUBLIC_ADDRESS = created.publicAddress;
  }

  if (created?.siweSessionSecret && shouldCreateSiweSecret) {
    updates.SIWE_SESSION_SECRET = created.siweSessionSecret;
  }

  const resolvedEnvFile = resolve(options.envFile);
  const currentContents = existsSync(resolvedEnvFile)
    ? await readFile(resolvedEnvFile, 'utf8')
    : '';

  const nextContents = upsertEnvEntries(currentContents, updates);

  if (Object.keys(updates).length > 0) {
    await writeFile(resolvedEnvFile, nextContents, 'utf8');
  }

  return {
    created,
    envFile: resolvedEnvFile,
    reusedExistingSigner: hasCompleteSigner && !options.force,
    reusedExistingSiweSecret: options.includeSiwe && hasSiweSecret && !options.force,
  };
}
