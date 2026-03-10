import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import type { CreditImprovementTip } from '@okx-credit/scoring';
import { afterEach, describe, expect, it } from 'vitest';
import { createMcpServer } from './lib/create-server.js';

describe('MCP integration lifecycle', () => {
  const transports: InMemoryTransport[] = [];

  afterEach(async () => {
    await Promise.all(transports.map((transport) => transport.close()));
    transports.length = 0;
  });

  it('covers initialize, tools/list, tools/call, and structured success payloads', async () => {
    const server = createMcpServer({
      analyzeCredit: async (wallet) => ({
        wallet,
        score: 712,
        tier: 'good',
        dimensions: {
          walletAge: { score: 88, detail: 'Wallet active for 24 months.' },
          assetScale: { score: 74, detail: 'Portfolio value $18,000.' },
          positionStability: { score: 69, detail: 'Average holding duration 6 months.' },
          repaymentHistory: { score: 81, detail: 'Repaid 9/10 borrow positions.' },
          multichain: { score: 50, detail: 'Active on 3 chains.' },
        },
        improvementTips: [
          {
            action: 'Repay open borrows faster.',
            currentValue: 81,
            dimensionKey: 'repaymentHistory',
            dimensionLabel: 'Repayment history',
            estimatedPointGain: 26,
          },
        ],
        credential: null,
        computedAt: '2026-03-10T00:00:00.000Z',
        expiresAt: '2026-03-11T00:00:00.000Z',
      }),
      getScore: async (wallet) => ({
        wallet,
        score: 689,
        tier: 'good',
        dimensions: {
          walletAge: 85,
          assetScale: 70,
          positionStability: 66,
          repaymentHistory: 73,
          multichain: 50,
        },
        computedAt: '2026-03-10T00:00:00.000Z',
        expiresAt: '2026-03-11T00:00:00.000Z',
      }),
      getImprovementTipsForWallet: async (wallet, limit) => ({
        wallet,
        currentScore: 689,
        tips: (
          [
            {
              action: 'Repay open borrows faster.',
              currentValue: 60,
              dimensionKey: 'repaymentHistory',
              dimensionLabel: 'Repayment history',
              estimatedPointGain: 40,
            },
            {
              action: 'Expand credible activity to more chains.',
              currentValue: 50,
              dimensionKey: 'multichain',
              dimensionLabel: 'Multichain activity',
              estimatedPointGain: 28,
            },
          ] satisfies CreditImprovementTip[]
        ).slice(0, limit),
      }),
    });
    const client = new Client(
      {
        name: 'okx-credit-integration-client',
        version: '1.0.0',
      },
      {
        capabilities: {},
      }
    );
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    transports.push(clientTransport, serverTransport);

    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

    const toolsResult = await client.listTools();
    expect(toolsResult.tools.map((tool) => tool.name).sort()).toEqual([
      'analyze_credit',
      'get_improvement_tips',
      'get_score',
    ]);

    const analyzeResult = await client.callTool({
      name: 'analyze_credit',
      arguments: {
        wallet: '0x1234567890abcdef1234567890abcdef12345678',
      },
    });
    expect(analyzeResult.isError).not.toBe(true);
    expect(analyzeResult.structuredContent).toMatchObject({
      wallet: '0x1234567890abcdef1234567890abcdef12345678',
      score: 712,
    });

    const scoreResult = await client.callTool({
      name: 'get_score',
      arguments: {
        wallet: '0x1234567890abcdef1234567890abcdef12345678',
      },
    });
    expect(scoreResult.isError).not.toBe(true);
    expect(scoreResult.structuredContent).toMatchObject({
      score: 689,
      tier: 'good',
    });

    const tipsResult = await client.callTool({
      name: 'get_improvement_tips',
      arguments: {
        wallet: '0x1234567890abcdef1234567890abcdef12345678',
        limit: 2,
      },
    });
    expect(tipsResult.isError).not.toBe(true);
    expect(tipsResult.structuredContent).toMatchObject({
      currentScore: 689,
    });
    expect((tipsResult.structuredContent as { tips: CreditImprovementTip[] }).tips).toHaveLength(2);
  });

  it('returns a structured MCP tool error on invalid wallet input', async () => {
    const server = createMcpServer();
    const client = new Client(
      {
        name: 'okx-credit-integration-client',
        version: '1.0.0',
      },
      {
        capabilities: {},
      }
    );
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    transports.push(clientTransport, serverTransport);

    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

    const result = await client.callTool({
      name: 'get_score',
      arguments: {
        wallet: 'bad-wallet',
      },
    });

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toMatchObject({
      error: {
        code: 'INVALID_WALLET',
      },
    });
  });
});
