import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { NodeSDK } from "@opentelemetry/sdk-node";
import {
  experimental_createMCPClient,
  ModelMessage,
  stepCountIs,
  streamText,
} from "ai";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createFreeplaySpanProcessor,
  getPrompt,
  FreeplayModel,
  createFreeplayTelemetry,
} from "@freeplayai/vercel";
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

    const inputVariables = {
      accent: "cowboy",
    };

    // Get prompt from Freeplay
    const prompt = await getPrompt({
      templateName: "funny-accent", // TODO: Replace with your prompt name
      variables: inputVariables,
      messages,
    });

    // Automatically select the correct model provider based on the prompt
    const model = await FreeplayModel(prompt);

    // Create MCP client connecting to our local server
    const transport = new StreamableHTTPClientTransport(
      new URL(`http://localhost:${PORT}/api/mcp/server`),
    );

    const client = await experimental_createMCPClient({
      transport,
    });

    const tools = await client.tools();

    const result = streamText({
      model,
      tools,
      stopWhen: stepCountIs(5),
      onStepFinish: async ({ toolResults }) => {
        console.log(`STEP RESULTS: ${JSON.stringify(toolResults, null, 2)}`);
      },
      system: prompt.systemContent,
      messages: messages,
      onFinish: async () => {
        await client.close();
      },
      experimental_telemetry: createFreeplayTelemetry(prompt, {
        functionId: "demo for rob",
        sessionId: sessionId,
        inputVariables,
      }),
      // Optional, enables immediate clean up of resources but connection will not be retained for retries:
      // onError: async error => {
      //   await client.close();
      // },
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
    console.error(error);
    res.status(500).json({ error: "Unexpected error" });
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
