import { anthropic } from "@ai-sdk/anthropic";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { experimental_createMCPClient, stepCountIs, streamText } from "ai";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createFreeplaySpanProcessor } from "freeplay-vercel-ai-sdk";
import {
  expressToIncomingMessage,
  wrapExpressResponse,
} from "./mcp/express-adapter.js";
import { createMcpHandler } from "./mcp/handler.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from shared examples/.env
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

// Initialize OpenTelemetry with Freeplay
const sdk = new NodeSDK({
  spanProcessors: [createFreeplaySpanProcessor()],
});

// Start the SDK
sdk.start();

// Graceful shutdown
process.on("SIGTERM", async () => {
  await sdk.shutdown();
});

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// MCP Server endpoint
const mcpHandler = createMcpHandler();
app.post("/api/mcp/server", async (req, res) => {
  const incomingMessage = expressToIncomingMessage(req);
  const serverResponse = wrapExpressResponse(res);
  await mcpHandler(incomingMessage, serverResponse);
});

// MCP Chat endpoint
app.post("/api/mcp/chat", async (req, res) => {
  try {
    const { messages, sessionId } = req.body;

    // Create MCP client connecting to our local server
    const transport = new StreamableHTTPClientTransport(
      new URL(`http://localhost:${PORT}/api/mcp/server`),
    );

    const client = await experimental_createMCPClient({
      transport,
    });

    const tools = await client.tools();

    const result = streamText({
      model: anthropic("claude-haiku-4-5"),
      tools,
      stopWhen: stepCountIs(5),
      system: "You are a helpful chatbot capable of basic arithmetic problems",
      messages,
      onFinish: async () => {
        await client.close();
      },
      experimental_telemetry: {
        isEnabled: true,
        functionId: "rob test",
        metadata: {
          sessionId: sessionId || "default",
        },
      },
    });

    // Set headers for streaming
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // Stream the response
    const stream = result.textStream;

    for await (const chunk of stream) {
      res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error) {
    console.error("MCP Chat Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

// Handle graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n⏳ SIGINT received, shutting down gracefully...");

  server.close(async () => {
    console.log("✅ HTTP server closed");

    try {
      await sdk.shutdown();
      console.log("✅ OpenTelemetry SDK shut down successfully");
      process.exit(0);
    } catch (error) {
      console.error("❌ Error shutting down SDK:", error);
      process.exit(1);
    }
  });
});
