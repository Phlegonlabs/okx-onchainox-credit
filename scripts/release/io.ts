export function writeStdout(line: string): void {
  process.stdout.write(`${line}\n`);
}

export function writeStderr(line: string): void {
  process.stderr.write(`${line}\n`);
}
