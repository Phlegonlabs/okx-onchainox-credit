import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CreditAnalysis, CreditImprovementTip, Score } from '@okx-credit/scoring';
import { registerAnalyzeCreditTool } from './analyze-credit.js';
import { registerGetImprovementTipsTool } from './get-improvement-tips.js';
import { registerGetScoreTool } from './get-score.js';

interface CreditToolDependencies {
  analyzeCredit?: (wallet: string) => Promise<CreditAnalysis>;
  getScore?: (wallet: string) => Promise<Score>;
  getImprovementTipsForWallet?: (
    wallet: string,
    limit: number
  ) => Promise<{
    currentScore: number;
    tips: CreditImprovementTip[];
    wallet: string;
  }>;
}

export function registerCreditTools(server: McpServer, dependencies: CreditToolDependencies = {}) {
  registerAnalyzeCreditTool(server, dependencies);
  registerGetScoreTool(server, dependencies);
  registerGetImprovementTipsTool(server, dependencies);
}
