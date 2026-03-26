import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

export function createToolResult<T extends object>(structuredContent: T): CallToolResult {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(structuredContent, null, 2),
      },
    ],
    structuredContent: structuredContent as Record<string, unknown>,
  };
}

export function createToolError(
  code: string,
  message: string,
  details?: Record<string, unknown>
): CallToolResult {
  return {
    content: [
      {
        type: 'text',
        text: `${code}: ${message}`,
      },
    ],
    structuredContent: {
      error: {
        code,
        message,
        ...(details ?? {}),
      },
    },
    isError: true,
  };
}

export { isValidEvmWallet } from '@graxis/scoring';
