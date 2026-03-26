import { Command, CommanderError } from 'commander';
import { registerScoreCommand } from './commands/score-command.js';
import { registerVerifyCommand } from './commands/verify-command.js';
import { CliError } from './lib/errors.js';
import { type CliIo, defaultCliIo } from './lib/io.js';

interface CliDependencies {
  fileReader?: Parameters<typeof registerVerifyCommand>[1]['fileReader'];
  io?: CliIo;
  scoreLoader?: Parameters<typeof registerScoreCommand>[1]['scoreLoader'];
  verifyCredential?: Parameters<typeof registerVerifyCommand>[1]['verifyCredential'];
}

export function createCliProgram(dependencies: CliDependencies = {}) {
  const io = dependencies.io ?? defaultCliIo;
  const program = new Command();

  program.exitOverride();
  program.configureOutput({
    writeErr: (message) => io.stderr(message.trimEnd()),
    writeOut: (message) => io.stdout(message.trimEnd()),
  });
  program.name('graxis').description('Graxis CLI');
  registerScoreCommand(program, {
    io,
    ...(dependencies.scoreLoader ? { scoreLoader: dependencies.scoreLoader } : {}),
  });
  registerVerifyCommand(program, {
    io,
    ...(dependencies.fileReader ? { fileReader: dependencies.fileReader } : {}),
    ...(dependencies.verifyCredential ? { verifyCredential: dependencies.verifyCredential } : {}),
  });

  return program;
}

export async function runCli(argv: string[], dependencies: CliDependencies = {}) {
  const io = dependencies.io ?? defaultCliIo;

  try {
    const program = createCliProgram({
      fileReader: dependencies.fileReader,
      io,
      scoreLoader: dependencies.scoreLoader,
      verifyCredential: dependencies.verifyCredential,
    });

    await program.parseAsync(argv);
    return 0;
  } catch (error) {
    if (error instanceof CliError) {
      if (!error.reported) {
        io.stderr(error.message);
      }
      return error.exitCode;
    }

    if (error instanceof CommanderError) {
      return error.exitCode;
    }

    io.stderr(error instanceof Error ? error.message : String(error));
    return 1;
  }
}
