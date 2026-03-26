import { type CreditAnalysis, analyzeWalletCredit } from '@graxis/scoring';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import * as z from 'zod/v4';
import { createToolError, createToolResult, isValidEvmWallet } from '../lib/tool-results.js';

interface AnalyzeCreditDependencies {
  analyzeCredit?: (wallet: string) => Promise<CreditAnalysis>;
}

const analyzeCreditInputSchema = {
  wallet: z.string().describe('EVM wallet address to analyze'),
  issue_credential: z
    .boolean()
    .optional()
    .describe('Reserved for future credential issuance. Returns null in M6.'),
};

interface AnalyzeCreditInput {
  issue_credential?: boolean;
  wallet: string;
}

export function registerAnalyzeCreditTool(
  server: McpServer,
  dependencies: AnalyzeCreditDependencies = {}
) {
  const analyzeCredit = dependencies.analyzeCredit ?? analyzeWalletCredit;
  const registerTool = server.registerTool.bind(server) as (
    name: string,
    config: {
      description: string;
      inputSchema: unknown;
    },
    callback: (args: AnalyzeCreditInput) => Promise<CallToolResult>
  ) => void;

  registerTool(
    'analyze_credit',
    {
      description:
        'Return the full Graxis credit analysis for a wallet, including score, breakdown, and ranked improvement tips.',
      inputSchema: analyzeCreditInputSchema,
    },
    async ({ wallet }: AnalyzeCreditInput) => {
      if (!isValidEvmWallet(wallet)) {
        return createToolError(
          'INVALID_WALLET',
          'Wallet must be a valid 0x-prefixed 20-byte EVM address.',
          { wallet }
        );
      }

      try {
        const analysis = await analyzeCredit(wallet);
        return createToolResult(analysis);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const code = message === 'OKX_API_TIMEOUT' ? 'OKX_API_TIMEOUT' : 'ANALYSIS_FAILED';

        return createToolError(
          code,
          code === 'OKX_API_TIMEOUT'
            ? 'OKX OnchainOS API timed out while analyzing this wallet.'
            : 'Credit analysis failed.',
          { wallet }
        );
      }
    }
  );
}
