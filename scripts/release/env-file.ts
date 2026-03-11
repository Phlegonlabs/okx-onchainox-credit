import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

function normalizeEnvValue(rawValue: string): string {
  const trimmedValue = rawValue.trim();

  if (
    (trimmedValue.startsWith('"') && trimmedValue.endsWith('"')) ||
    (trimmedValue.startsWith("'") && trimmedValue.endsWith("'"))
  ) {
    return trimmedValue.slice(1, -1);
  }

  return trimmedValue.replace(/\s+#.*$/, '').trim();
}

export function parseEnvFile(contents: string): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};

  for (const rawLine of contents.split(/\r?\n/u)) {
    const line = rawLine.trim();

    if (!line || line.startsWith('#')) {
      continue;
    }

    const normalizedLine = line.startsWith('export ') ? line.slice(7).trim() : line;
    const separatorIndex = normalizedLine.indexOf('=');

    if (separatorIndex <= 0) {
      continue;
    }

    const key = normalizedLine.slice(0, separatorIndex).trim();
    const value = normalizedLine.slice(separatorIndex + 1);

    env[key] = normalizeEnvValue(value);
  }

  return env;
}

export async function readEnvFile(filePath: string): Promise<NodeJS.ProcessEnv> {
  const resolvedPath = resolve(filePath);
  const contents = await readFile(resolvedPath, 'utf8');

  return parseEnvFile(contents);
}
