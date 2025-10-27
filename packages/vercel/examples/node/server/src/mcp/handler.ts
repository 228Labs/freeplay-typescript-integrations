import { IncomingMessage, ServerResponse } from "http";
import { handleMcpRequest, McpServerConfig } from "./server-core.js";

/**
 * Creates an MCP handler for Express that wraps the shared core logic
 */
export const createMcpHandler = (config?: McpServerConfig) => {
  return async (req: IncomingMessage, res: ServerResponse) => {
    await handleMcpRequest(req, res, {
      name: "MCP Node.js Server",
      version: "0.1.0",
      ...config,
    });
  };
};
