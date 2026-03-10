import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { afterEach, describe, expect, it } from 'vitest';
import { createMcpServer } from './lib/create-server.js';

describe('MCP server scaffold', () => {
  const transports: InMemoryTransport[] = [];

  afterEach(async () => {
    await Promise.all(transports.map((transport) => transport.close()));
    transports.length = 0;
  });

  it('completes initialize and exposes the three scaffolded tools', async () => {
    const server = createMcpServer();
    const client = new Client(
      {
        name: 'okx-credit-test-client',
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
    const toolNames = toolsResult.tools.map((tool) => tool.name).sort();

    expect(toolNames).toEqual(['analyze_credit', 'get_improvement_tips', 'get_score']);
  });
});
