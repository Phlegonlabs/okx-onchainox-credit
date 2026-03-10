import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { type Score, getWalletScore } from '@okx-credit/scoring';
import * as z from 'zod/v4';
import { createToolError, createToolResult, isValidEvmWallet } from '../lib/tool-results.js';

interface GetScoreDependencies {
  getScore?: (wallet: string) => Promise<Score>;
}

interface GetScoreInput {
  wallet: string;
}

const getScoreInputSchema = {
  wallet: z.string().describe('EVM wallet address to score'),
};

export function registerGetScoreTool(server: McpServer, dependencies: GetScoreDependencies = {}) {
  const resolveScore = dependencies.getScore ?? getWalletScore;
  const registerTool = server.registerTool.bind(server) as (
    name: string,
    config: {
      description: string;
      inputSchema: unknown;
    },
    callback: (args: GetScoreInput) => Promise<CallToolResult>
  ) => void;

  registerTool(
    'get_score',
    {
      description:
        'Return the current OKX OnchainOS credit score and weighted dimension breakdown for a wallet.',
      inputSchema: getScoreInputSchema,
    },
    async ({ wallet }: GetScoreInput) => {
      if (!isValidEvmWallet(wallet)) {
        return createToolError(
          'INVALID_WALLET',
          'Wallet must be a valid 0x-prefixed 20-byte EVM address.',
          { wallet }
        );
      }

      try {
        const score = await resolveScore(wallet);
        return createToolResult(score);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const code = message === 'OKX_API_TIMEOUT' ? 'OKX_API_TIMEOUT' : 'SCORE_LOOKUP_FAILED';

        return createToolError(
          code,
          code === 'OKX_API_TIMEOUT'
            ? 'OKX OnchainOS API timed out while scoring this wallet.'
            : 'Score lookup failed.',
          { wallet }
        );
      }
    }
  );
}
