import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

/**
 * Default MCP tools for demonstration
 */

export function registerDefaultTools(server: McpServer) {
  // Register a simple calculator tool
  server.tool(
    "add",
    "Add two numbers together",
    {
      a: z.number().describe("First number"),
      b: z.number().describe("Second number"),
    },
    async ({ a, b }) => {
      const result = a + b;
      return {
        content: [
          {
            type: "text",
            text: `The sum of ${a} and ${b} is ${result}`,
          },
        ],
      };
    },
  );

  // Register a multiply tool
  server.tool(
    "multiply",
    "Multiply two numbers together",
    {
      a: z.number().describe("First number"),
      b: z.number().describe("Second number"),
    },
    async ({ a, b }) => {
      const result = a * b;
      return {
        content: [
          {
            type: "text",
            text: `The product of ${a} and ${b} is ${result}`,
          },
        ],
      };
    },
  );
}
