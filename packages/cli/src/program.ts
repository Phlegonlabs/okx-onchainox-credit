import { Command, CommanderError } from 'commander';
import { registerScoreCommand } from './commands/score-command.js';
import { CliError } from './lib/errors.js';
import { type CliIo, defaultCliIo } from './lib/io.js';

interface CliDependencies {
  io?: CliIo;
  scoreLoader?: Parameters<typeof registerScoreCommand>[1]['scoreLoader'];
}

export function createCliProgram(dependencies: CliDependencies = {}) {
  const io = dependencies.io ?? defaultCliIo;
  const program = new Command();

  program.exitOverride();
  program.configureOutput({
    writeErr: (message) => io.stderr(message.trimEnd()),
    writeOut: (message) => io.stdout(message.trimEnd()),
  });
  program.name('okx-credit').description('OKX OnchainOS Credit CLI');
  registerScoreCommand(program, {
    io,
    ...(dependencies.scoreLoader ? { scoreLoader: dependencies.scoreLoader } : {}),
  });

  return program;
}

export async function runCli(argv: string[], dependencies: CliDependencies = {}) {
  const io = dependencies.io ?? defaultCliIo;

  try {
    const program = createCliProgram({
      io,
      scoreLoader: dependencies.scoreLoader,
    });

    await program.parseAsync(argv);
    return 0;
  } catch (error) {
    if (error instanceof CliError) {
      io.stderr(error.message);
      return error.exitCode;
    }

    if (error instanceof CommanderError) {
      return error.exitCode;
    }

    io.stderr(error instanceof Error ? error.message : String(error));
    return 1;
  }
}
