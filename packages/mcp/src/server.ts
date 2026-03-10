import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMcpServer } from './lib/create-server.js';

async function main() {
  const server = createMcpServer();
  const transport = new StdioServerTransport();

  await server.connect(transport);
}

main().catch((error) => {
  process.stderr.write(
    `MCP server bootstrap failed: ${error instanceof Error ? error.message : String(error)}\n`
  );
  process.exit(1);
});
