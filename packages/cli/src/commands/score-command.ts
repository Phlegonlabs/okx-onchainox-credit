import { type Score, getWalletScore, isValidEvmWallet } from '@okx-credit/scoring';
import type { Command } from 'commander';
import { CliError } from '../lib/errors.js';
import type { CliIo } from '../lib/io.js';
import {
  type ScoreOutputFormat,
  formatScoreAsJson,
  formatScoreAsTable,
} from '../lib/score-output.js';

interface ScoreCommandDependencies {
  io: CliIo;
  scoreLoader?: (wallet: string) => Promise<Score>;
}

function assertSupportedFormat(format: string): asserts format is ScoreOutputFormat {
  if (format !== 'json' && format !== 'table') {
    throw new CliError(`Unsupported format: ${format}. Use "table" or "json".`);
  }
}

export function registerScoreCommand(program: Command, dependencies: ScoreCommandDependencies) {
  const scoreLoader = dependencies.scoreLoader ?? getWalletScore;

  program
    .command('score')
    .description('Fetch the current wallet credit score')
    .argument('<wallet>', 'EVM wallet address')
    .option('--format <format>', 'output format: table | json', 'table')
    .action(async (wallet: string, options: { format: string }) => {
      if (!isValidEvmWallet(wallet)) {
        throw new CliError('Wallet must be a valid 0x-prefixed 20-byte EVM address.');
      }

      assertSupportedFormat(options.format);

      const score = await scoreLoader(wallet);
      const output =
        options.format === 'json' ? formatScoreAsJson(score) : formatScoreAsTable(score);

      dependencies.io.stdout(output);
    });
}
