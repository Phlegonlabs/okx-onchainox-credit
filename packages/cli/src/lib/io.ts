export interface CliIo {
  stderr: (message: string) => void;
  stdout: (message: string) => void;
}

export const defaultCliIo: CliIo = {
  stdout: (message) => {
    process.stdout.write(`${message}\n`);
  },
  stderr: (message) => {
    process.stderr.write(`${message}\n`);
  },
};
