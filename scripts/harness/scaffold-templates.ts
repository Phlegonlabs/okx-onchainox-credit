// scaffold command — inject capability templates into the project.
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { ok, warn, info, fail } from './config.js';

const TEMPLATES: Record<string, () => void> = {
  skill: generateSkillMd,
  mcp: generateMcpScaffold,
  'agent-test': generateAgentTests,
};

export async function runScaffold(type?: string): Promise<void> {
  if (!type) {
    info('Available scaffold types:');
    info('  skill         — SKILL.md at project root (agent discovery)');
    info('  mcp           — MCP server scaffold in packages/mcp/src/');
    info('  agent-test    — MCP integration tests');
    return;
  }

  const generator = TEMPLATES[type];
  if (!generator) {
    fail(`Unknown scaffold type: ${type}. Run without args to see options.`);
  }
  generator!();
}

function generateSkillMd(): void {
  const content = `---
name: okx-onchainos-credit
description: >
  On-chain credit scoring MCP server. Computes a 300-850 FICO-equivalent credit score
  from wallet history across 60+ chains using OKX OnchainOS APIs. Returns score,
  5-dimension breakdown, and personalized improvement tips. Useful for credit analysis,
  lending decisions, and wallet due diligence.
version: 0.1.0
transport: stdio
command: bun run --cwd packages/mcp start
---

## Tools

### analyze_credit
Full credit analysis for a wallet address.
- Input: \`{ wallet: string }\` — EIP-55 checksummed EVM address
- Output: \`{ score, tier, dimensions, improvementTips, issuedAt }\`

### get_score
Score + dimension breakdown only (faster than analyze_credit).
- Input: \`{ wallet: string }\`
- Output: \`{ score, tier, dimensions }\`

### get_improvement_tips
Ranked improvement tips for a wallet.
- Input: \`{ wallet: string, limit?: number }\`
- Output: \`{ tips: [{ dimension, action, estimatedGain }] }\`

## Examples

\`\`\`
"分析这个钱包的链上信用情况: 0xABCD..."
"What is the credit score for 0xABCD...?"
"How can 0xABCD... improve their on-chain credit score?"
\`\`\`

## Environment Variables

\`\`\`
OKX_API_KEY=       # OKX OnchainOS API key
OKX_SECRET_KEY=    # OKX API secret
OKX_PASSPHRASE=    # OKX API passphrase
\`\`\`
`;
  writeFileSync('SKILL.md', content);
  ok('Generated: SKILL.md');
}

function generateMcpScaffold(): void {
  const toolsDir = 'packages/mcp/src/tools';
  const libDir = 'packages/mcp/src/lib';
  if (!existsSync(toolsDir)) mkdirSync(toolsDir, { recursive: true });
  if (!existsSync(libDir)) mkdirSync(libDir, { recursive: true });

  ok('MCP scaffold: run M6-001 through M6-005 to implement tools');
  info('Structure: packages/mcp/src/{server.ts,tools/,lib/}');
}

function generateAgentTests(): void {
  const testsDir = 'packages/mcp/tests';
  if (!existsSync(testsDir)) mkdirSync(testsDir, { recursive: true });

  const content = `// MCP integration test skeleton — fill out during M6-008
import { describe, it, expect } from 'vitest';

describe('MCP Server lifecycle', () => {
  it('responds to initialize request', async () => {
    // TODO: M6-008 — start server, send initialize, check response
    expect(true).toBe(true);
  });

  it('lists 3 tools', async () => {
    // TODO: M6-008
    expect(true).toBe(true);
  });

  it('calls get_score and returns structured response', async () => {
    // TODO: M6-008
    expect(true).toBe(true);
  });

  it('returns structured error on invalid wallet', async () => {
    // TODO: M6-008
    expect(true).toBe(true);
  });
});
`;
  writeFileSync('packages/mcp/tests/mcp.test.ts', content);
  ok('Generated: packages/mcp/tests/mcp.test.ts');
}
