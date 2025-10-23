import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

/**
 * Shared MCP tool definitions that can be used across different server implementations
 */

export function registerCalculateSumTool(server: McpServer) {
  server.tool(
    "calculateSum",
    "Returns the sum of N numbers",
    {
      values: z.array(z.number()),
    },
    async ({ values }: { values: number[] }) => ({
      content: [
        {
          type: "text",
          text: `Sum: ${values.reduce((a: number, b: number) => a + b, 0)}`,
        },
      ],
    }),
  );
}

/**
 * Register all default tools for examples
 */
export function registerDefaultTools(server: McpServer) {
  registerCalculateSumTool(server);
  // Add more tools here as needed
}
