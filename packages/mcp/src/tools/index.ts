import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

const notImplementedText =
  'This MCP tool is scaffolded in M6-001 and will be implemented in the next M6 tasks.';

export function registerCreditTools(server: McpServer) {
  server.registerTool(
    'analyze_credit',
    {
      description:
        'Return the full OKX OnchainOS credit analysis for a wallet, including score, breakdown, and ranked improvement tips.',
    },
    async () => ({
      content: [
        {
          text: notImplementedText,
          type: 'text',
        },
      ],
      isError: true,
    })
  );

  server.registerTool(
    'get_score',
    {
      description:
        'Return the current OKX OnchainOS credit score and weighted dimension breakdown for a wallet.',
    },
    async () => ({
      content: [
        {
          text: notImplementedText,
          type: 'text',
        },
      ],
      isError: true,
    })
  );

  server.registerTool(
    'get_improvement_tips',
    {
      description:
        'Return ranked improvement tips for a wallet, including estimated point gain for each action.',
    },
    async () => ({
      content: [
        {
          text: notImplementedText,
          type: 'text',
        },
      ],
      isError: true,
    })
  );
}
