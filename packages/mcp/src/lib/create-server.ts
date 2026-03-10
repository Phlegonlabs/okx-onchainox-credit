import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerCreditTools } from '../tools/index.js';
import { MCP_SERVER_INFO } from './server-info.js';

export function createMcpServer() {
  const server = new McpServer({
    name: MCP_SERVER_INFO.name,
    version: MCP_SERVER_INFO.version,
  });

  registerCreditTools(server);

  return server;
}
