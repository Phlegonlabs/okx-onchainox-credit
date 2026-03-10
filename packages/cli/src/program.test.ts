import type { IssuedCredential, Score } from '@okx-credit/scoring';
import { describe, expect, it } from 'vitest';
import { runCli } from './program.js';

const VALID_WALLET = '0x1234567890abcdef1234567890abcdef12345678';

function createIoCapture() {
  const stdout: string[] = [];
  const stderr: string[] = [];

  return {
    io: {
      stderr: (message: string) => {
        stderr.push(message);
      },
      stdout: (message: string) => {
        stdout.push(message);
      },
    },
    stderr,
    stdout,
  };
}

function createScore(): Score {
  return {
    wallet: VALID_WALLET,
    score: 689,
    tier: 'good',
    dimensions: {
      walletAge: 85,
      assetScale: 70,
      positionStability: 66,
      repaymentHistory: 73,
      multichain: 50,
    },
    computedAt: '2026-03-10T00:00:00.000Z',
    expiresAt: '2026-03-11T00:00:00.000Z',
  };
}

function createCredential(): IssuedCredential {
  return {
    wallet: VALID_WALLET,
    score: 689,
    tier: 'good',
    dimensions: createScore().dimensions,
    version: '1.0',
    issuer: 'okx-onchainos-credit',
    issuedAt: 1741564800,
    expiresAt: 1744156800,
    signature: '0xsignature',
  };
}

describe('runCli', () => {
  it('prints score output in table format by default', async () => {
    const capture = createIoCapture();

    const exitCode = await runCli(['node', 'okx-credit', 'score', VALID_WALLET], {
      io: capture.io,
      scoreLoader: async () => createScore(),
    });

    expect(exitCode).toBe(0);
    expect(capture.stdout[0]).toContain('Score: 689 (good)');
    expect(capture.stdout[0]).toContain('Dimensions:');
  });

  it('prints score output in JSON format when requested', async () => {
    const capture = createIoCapture();

    const exitCode = await runCli(
      ['node', 'okx-credit', 'score', VALID_WALLET, '--format', 'json'],
      {
        io: capture.io,
        scoreLoader: async () => createScore(),
      }
    );

    expect(exitCode).toBe(0);
    expect(capture.stdout[0]).toContain(`"wallet": "${VALID_WALLET}"`);
    expect(capture.stdout[0]).toContain('"score": 689');
  });

  it('returns a non-zero exit code for invalid wallet input', async () => {
    const capture = createIoCapture();

    const exitCode = await runCli(['node', 'okx-credit', 'score', 'not-a-wallet'], {
      io: capture.io,
    });

    expect(exitCode).toBe(1);
    expect(capture.stderr[0]).toContain('Wallet must be a valid 0x-prefixed 20-byte EVM address.');
  });

  it('verifies a credential file and prints the result', async () => {
    const capture = createIoCapture();

    const exitCode = await runCli(['node', 'okx-credit', 'verify', 'credential.json'], {
      fileReader: async () => JSON.stringify(createCredential()),
      io: capture.io,
      verifyCredential: async () => true,
    });

    expect(exitCode).toBe(0);
    expect(capture.stdout[0]).toContain('Valid: true');
    expect(capture.stdout[0]).toContain(`Wallet: ${VALID_WALLET}`);
  });

  it('returns exit code 1 when credential verification fails', async () => {
    const capture = createIoCapture();

    const exitCode = await runCli(['node', 'okx-credit', 'verify', 'credential.json'], {
      fileReader: async () => JSON.stringify(createCredential()),
      io: capture.io,
      verifyCredential: async () => false,
    });

    expect(exitCode).toBe(1);
    expect(capture.stdout[0]).toContain('Valid: false');
    expect(capture.stderr).toHaveLength(0);
  });
});
