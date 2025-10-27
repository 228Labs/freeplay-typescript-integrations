import { ServerResponse } from "http";
import { NextRequest } from "next/server";
import { handleMcpRequest, McpServerConfig } from "./server-core";
import { convertNextRequestToIncomingMessage } from "./incoming-message";

/**
 * Creates an MCP handler for Next.js API routes that wraps the shared core logic
 */
export const mcpApiHandler = initializeMcpApiHandler({
  name: "MCP Next.js Server",
  version: "0.1.0",
});

function initializeMcpApiHandler(config: McpServerConfig) {
  return async function mcpApiHandler(req: NextRequest, res: ServerResponse) {
    const url = new URL(req.url || "", "https://example.com");

    if (url.pathname === "/mcp/server") {
      if (req.method === "GET" || req.method === "DELETE") {
        console.log(`Received ${req.method} MCP request`);
        res.writeHead(405, { "Content-Type": "application/json" }).end(
          JSON.stringify({
            jsonrpc: "2.0",
            error: {
              code: -32000,
              message: "Method not allowed.",
            },
            id: null,
          }),
        );
        return;
      }

      if (req.method === "POST") {
        const incomingMessage = await convertNextRequestToIncomingMessage(req);
        await handleMcpRequest(incomingMessage, res, config);
      }
    } else {
      res.statusCode = 404;
      res.end("Not found");
    }
  };
}
