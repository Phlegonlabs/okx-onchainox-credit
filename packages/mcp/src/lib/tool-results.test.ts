import { describe, expect, it } from 'vitest';
import { createToolError, createToolResult, isValidEvmWallet } from './tool-results.js';

describe('isValidEvmWallet', () => {
  it('returns true for a valid lowercase hex address', () => {
    expect(isValidEvmWallet('0x1234567890abcdef1234567890abcdef12345678')).toBe(true);
  });

  it('returns true for a checksummed address', () => {
    expect(isValidEvmWallet('0xAbCdEf1234567890AbCdEf1234567890AbCdEf12')).toBe(true);
  });

  it('returns false for an address that is too short', () => {
    expect(isValidEvmWallet('0x1234567890abcdef')).toBe(false);
  });

  it('returns false for an address that is too long', () => {
    expect(isValidEvmWallet('0x1234567890abcdef1234567890abcdef123456789')).toBe(false);
  });

  it('returns false when 0x prefix is missing', () => {
    expect(isValidEvmWallet('1234567890abcdef1234567890abcdef12345678')).toBe(false);
  });

  it('returns false for non-hex characters', () => {
    expect(isValidEvmWallet('0x1234567890abcdef1234567890abcdef1234567g')).toBe(false);
  });

  it('returns false for an empty string', () => {
    expect(isValidEvmWallet('')).toBe(false);
  });

  it('returns false for a Solana-style address', () => {
    expect(isValidEvmWallet('9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM')).toBe(false);
  });
});

describe('createToolResult', () => {
  it('returns a CallToolResult with text content', () => {
    const data = { score: 720, tier: 'good' };
    const result = createToolResult(data);

    expect(result.isError).toBeUndefined();
    expect(result.content).toMatchObject([{ type: 'text' }]);
    expect(JSON.parse((result.content[0] as { text: string }).text)).toEqual(data);
  });

  it('sets structuredContent equal to the input object', () => {
    const data = { wallet: '0xabc', score: 500 };
    const result = createToolResult(data);

    expect(result.structuredContent).toEqual(data);
  });

  it('serializes nested objects correctly', () => {
    const data = { dimensions: { walletAge: 100, assetScale: 80 } };
    const result = createToolResult(data);
    const parsed = JSON.parse((result.content[0] as { text: string }).text) as typeof data;

    expect(parsed.dimensions.walletAge).toBe(100);
  });
});

describe('createToolError', () => {
  it('returns a CallToolResult with isError true', () => {
    const result = createToolError('WALLET_NOT_FOUND', 'Wallet was not found.');

    expect(result.isError).toBe(true);
  });

  it('formats content text as "CODE: message"', () => {
    const result = createToolError('WALLET_NOT_FOUND', 'Wallet was not found.');
    const text = (result.content[0] as { text: string }).text;

    expect(text).toBe('WALLET_NOT_FOUND: Wallet was not found.');
  });

  it('includes code and message in structuredContent.error', () => {
    const result = createToolError('RATE_LIMITED', 'Too many requests.');
    const error = (result.structuredContent as { error: Record<string, unknown> }).error;

    expect(error.code).toBe('RATE_LIMITED');
    expect(error.message).toBe('Too many requests.');
  });

  it('merges extra details into structuredContent.error', () => {
    const result = createToolError('RATE_LIMITED', 'Too many requests.', {
      retryAfter: 60,
    });
    const error = (result.structuredContent as { error: Record<string, unknown> }).error;

    expect(error.retryAfter).toBe(60);
  });

  it('works without details', () => {
    const result = createToolError('ERR', 'msg');
    const error = (result.structuredContent as { error: Record<string, unknown> }).error;

    expect(error.retryAfter).toBeUndefined();
  });
});
