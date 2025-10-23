import { ServerOptions } from "@modelcontextprotocol/sdk/server/index.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { IncomingMessage, ServerResponse } from "http";
import { registerDefaultTools } from "./tools";

/**
 * Core MCP server configuration and utilities shared across implementations
 */

export interface McpServerConfig {
  name?: string;
  version?: string;
  initializationCallback?: (server: McpServer) => void;
  serverOptions?: ServerOptions;
}

export const DEFAULT_SERVER_OPTIONS: ServerOptions = {
  capabilities: {
    tools: {},
  },
};

/**
 * Creates an MCP server instance with the given configuration
 */
export function createMcpServer(config: McpServerConfig = {}) {
  const {
    name = "MCP Server",
    version = "0.1.0",
    initializationCallback = registerDefaultTools,
    serverOptions = DEFAULT_SERVER_OPTIONS,
  } = config;

  return new McpServer({ name, version }, serverOptions);
}

/**
 * Handles an MCP request using a stateless transport
 */
export async function handleMcpRequest(
  req: IncomingMessage,
  res: ServerResponse,
  config: McpServerConfig = {},
) {
  console.log("New MCP connection", req.url, req.method);

  if (req.method === "POST") {
    // In Stateless Mode, we create a new instance for each request
    const server = createMcpServer(config);

    const statelessTransport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    const initCallback = config.initializationCallback || registerDefaultTools;
    initCallback(server);

    await server.connect(statelessTransport);
    await statelessTransport.handleRequest(req, res);
  } else {
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
  }
}
