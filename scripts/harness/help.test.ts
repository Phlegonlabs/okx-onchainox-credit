import { describe, expect, it } from 'vitest';
import { isHelpCommand } from './help.js';

describe('isHelpCommand', () => {
  it('accepts empty and explicit help commands', () => {
    expect(isHelpCommand(undefined)).toBe(true);
    expect(isHelpCommand('help')).toBe(true);
    expect(isHelpCommand('--help')).toBe(true);
    expect(isHelpCommand('-h')).toBe(true);
  });

  it('rejects regular harness commands', () => {
    expect(isHelpCommand('status')).toBe(false);
    expect(isHelpCommand('validate')).toBe(false);
  });
});
