import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { type CreditImprovementTip, getImprovementTips, getWalletScore } from '@okx-credit/scoring';
import * as z from 'zod/v4';
import { createToolError, createToolResult, isValidEvmWallet } from '../lib/tool-results.js';

interface ImprovementTipsPayload {
  currentScore: number;
  tips: CreditImprovementTip[];
  wallet: string;
}

interface GetImprovementTipsDependencies {
  getImprovementTipsForWallet?: (wallet: string, limit: number) => Promise<ImprovementTipsPayload>;
}

interface GetImprovementTipsInput {
  limit?: number;
  wallet: string;
}

const getImprovementTipsInputSchema = {
  wallet: z.string().describe('EVM wallet address to analyze'),
  limit: z.number().int().min(1).max(5).optional().describe('Maximum number of tips to return'),
};

async function getImprovementTipsForWallet(
  wallet: string,
  limit: number
): Promise<ImprovementTipsPayload> {
  const score = await getWalletScore(wallet);

  return {
    wallet,
    currentScore: score.score,
    tips: getImprovementTips(score.dimensions, limit),
  };
}

export function registerGetImprovementTipsTool(
  server: McpServer,
  dependencies: GetImprovementTipsDependencies = {}
) {
  const resolveImprovementTips =
    dependencies.getImprovementTipsForWallet ?? getImprovementTipsForWallet;
  const registerTool = server.registerTool.bind(server) as (
    name: string,
    config: {
      description: string;
      inputSchema: unknown;
    },
    callback: (args: GetImprovementTipsInput) => Promise<CallToolResult>
  ) => void;

  registerTool(
    'get_improvement_tips',
    {
      description:
        'Return ranked improvement tips for a wallet, including estimated point gain for each action.',
      inputSchema: getImprovementTipsInputSchema,
    },
    async ({ limit = 3, wallet }: GetImprovementTipsInput) => {
      if (!isValidEvmWallet(wallet)) {
        return createToolError(
          'INVALID_WALLET',
          'Wallet must be a valid 0x-prefixed 20-byte EVM address.',
          { wallet }
        );
      }

      try {
        return createToolResult(await resolveImprovementTips(wallet, limit));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const code = message === 'OKX_API_TIMEOUT' ? 'OKX_API_TIMEOUT' : 'IMPROVEMENT_TIPS_FAILED';

        return createToolError(
          code,
          code === 'OKX_API_TIMEOUT'
            ? 'OKX OnchainOS API timed out while generating improvement tips.'
            : 'Improvement tip generation failed.',
          { wallet }
        );
      }
    }
  );
}
