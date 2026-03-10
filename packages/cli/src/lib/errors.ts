export class CliError extends Error {
  exitCode: number;
  reported: boolean;

  constructor(message: string, exitCode = 1, reported = false) {
    super(message);
    this.name = 'CliError';
    this.exitCode = exitCode;
    this.reported = reported;
  }
}
